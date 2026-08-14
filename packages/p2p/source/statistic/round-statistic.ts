import type { Contracts } from "@mainsail/contracts";

import { Identifiers } from "@mainsail/constants";
import { inject, injectable } from "@mainsail/container";
import { performance } from "perf_hooks";

/* Each key holds running totals plus a fixed number of samples, so it costs the same whether it saw
 * one request or a million, and the number of ip keys is capped. The counts reported by
 * getGeneralStatistic stay exact regardless: a request from a peer past the cap still lands in the
 * round totals, and is counted in `recordsUnattributed` so the cap is visible. The added, removed and
 * banned lists are capped the same way, and what they leave out is counted in `peersDropped`.
 */
const MIN_MAX_SLICE = 3; // fastest / slowest response times reported per key
const MAX_ENDPOINT_SAMPLES = 32; // most recent response times kept per peer and endpoint
const MAX_TRACKED_PEERS = 250; // ip keys per round

const keepSlice = (slice: number[], responseTime: number, compare: (a: number, b: number) => number): void => {
	slice.push(responseTime);
	slice.sort(compare);
	slice.length = Math.min(slice.length, MIN_MAX_SLICE);
};

class ResponseAccumulator {
	public count = 0;
	public success = 0;

	#totalResponseTime = 0;
	readonly #fastest: number[] = [];
	readonly #slowest: number[] = [];

	public add(responseTime: number, success: boolean): void {
		this.count++;

		if (success) {
			this.success++;
		}

		this.#totalResponseTime += responseTime;
		keepSlice(this.#fastest, responseTime, (a, b) => a - b);
		keepSlice(this.#slowest, responseTime, (a, b) => b - a);
	}

	public get average(): number {
		return this.count === 0 ? 0 : Math.round(this.#totalResponseTime / this.count);
	}

	public get max(): number[] {
		return [...this.#slowest];
	}

	public get min(): number[] {
		return [...this.#fastest];
	}
}

class EndpointAccumulator {
	public readonly responses = new ResponseAccumulator();

	readonly #peers = new Set<string>();

	public add(ip: string, responseTime: number, success: boolean): void {
		this.responses.add(responseTime, success);

		if (this.#peers.size < MAX_TRACKED_PEERS) {
			this.#peers.add(ip);
		}
	}

	public get peers(): number {
		return this.#peers.size;
	}
}

class PeerAccumulator {
	public readonly responses = new ResponseAccumulator();

	readonly #endpoints = new Map<string, { count: number; responseTimes: number[] }>();

	public add(endpoint: string, responseTime: number, success: boolean): void {
		this.responses.add(responseTime, success);

		let samples = this.#endpoints.get(endpoint);
		if (samples === undefined) {
			samples = { count: 0, responseTimes: [] };
			this.#endpoints.set(endpoint, samples);
		}

		samples.count++;
		samples.responseTimes.push(responseTime);

		if (samples.responseTimes.length > MAX_ENDPOINT_SAMPLES) {
			samples.responseTimes.shift();
		}
	}

	public toStatistic(): Contracts.P2P.PeerSectionStatistic {
		return {
			average: this.responses.average,
			count: this.responses.count,
			endpoints: [...this.#endpoints.entries()]
				.sort(([, a], [, b]) => b.count - a.count)
				.map(([name, samples]) => ({
					name,
					responseTimes: [...samples.responseTimes].sort((a, b) => a - b),
				})),
			max: this.responses.max,
			min: this.responses.min,
			success: this.responses.success,
		};
	}
}

class SectionAccumulator {
	public unattributed = 0;

	public readonly byEndpoint = new Map<string, EndpointAccumulator>();
	public readonly byPeer = new Map<string, PeerAccumulator>();
	public readonly totals = new ResponseAccumulator();

	public record(ip: string, endpoint: string, responseTime: number, success: boolean): void {
		this.totals.add(responseTime, success);

		let endpointAccumulator = this.byEndpoint.get(endpoint);
		if (endpointAccumulator === undefined) {
			endpointAccumulator = new EndpointAccumulator();
			this.byEndpoint.set(endpoint, endpointAccumulator);
		}

		endpointAccumulator.add(ip, responseTime, success);

		let peerAccumulator = this.byPeer.get(ip);
		if (peerAccumulator === undefined) {
			if (this.byPeer.size >= MAX_TRACKED_PEERS) {
				this.unattributed++;
				return;
			}

			peerAccumulator = new PeerAccumulator();
			this.byPeer.set(ip, peerAccumulator);
		}

		peerAccumulator.add(endpoint, responseTime, success);
	}
}

@injectable()
export class RoundStatistic implements Contracts.P2P.RoundStatistic {
	@inject(Identifiers.Application.Instance)
	private readonly app!: Contracts.Kernel.Application;

	public height: number = 0;
	public round: number = 0;

	#startTime!: number;
	#endTime!: number;
	#totalPeers!: number;
	#totalPeersBanned = 0;

	readonly #emits = new SectionAccumulator();
	readonly #pings = new SectionAccumulator();

	#peersAdded = new Set<string>();
	#peersRemoved = new Set<string>();
	#peersBanned = new Set<string>();
	#peersDropped = 0;

	public start(): void {
		this.#startTime = performance.now();
		this.#endTime = 0;

		const peerRepository = this.app.get<Contracts.P2P.PeerRepository>(Identifiers.P2P.Peer.Repository);
		this.#totalPeers = peerRepository.getPeers().length;
	}

	public stop(): void {
		this.#endTime = performance.now();

		const peerDisposer = this.app.get<Contracts.P2P.PeerDisposer>(Identifiers.P2P.Peer.Disposer);
		this.#totalPeersBanned = peerDisposer.bannedPeers().length;
	}

	public addEmit(ip: string, endpoint: string, emitStatistic: Contracts.P2P.EmitStatistic): void {
		this.#emits.record(ip, endpoint, emitStatistic.responseTime, emitStatistic.success);
	}

	public addPing(ip: string, endpoint: string, pingStatistic: Contracts.P2P.PingStatistic): void {
		this.#pings.record(ip, endpoint, pingStatistic.responseTime, pingStatistic.success);
	}

	peerAdded(ip: string): void {
		this.#trackPeer(this.#peersAdded, ip);
	}

	peerRemoved(ip: string): void {
		// A saturated banned list can no longer tell a removal from a ban, so it is left out
		// entirely; the ban that caused it already counts in `peersDropped`.
		if (this.#peersBanned.has(ip) || this.#peersBanned.size >= MAX_TRACKED_PEERS) {
			return;
		}

		this.#trackPeer(this.#peersRemoved, ip);
	}

	peerBanned(ip: string): void {
		this.#peersRemoved.delete(ip);

		this.#trackPeer(this.#peersBanned, ip);
	}

	#trackPeer(peers: Set<string>, ip: string): void {
		if (peers.size >= MAX_TRACKED_PEERS) {
			this.#peersDropped++;
			return;
		}

		peers.add(ip);
	}

	public getGeneralStatistic(): Contracts.P2P.GeneralStatistic {
		const duration = Math.round(this.#endTime - this.#startTime);

		const count = {
			emitsFailed: this.#emits.totals.count - this.#emits.totals.success,
			emitsSuccess: this.#emits.totals.success,
			peersBanned: this.#totalPeersBanned,
			peersDropped: this.#peersDropped,
			peersRound: this.#emits.byPeer.size,
			peersTotal: this.#totalPeers,
			pingsFailed: this.#pings.totals.count - this.#pings.totals.success,
			pingsSuccess: this.#pings.totals.success,
			recordsUnattributed: this.#emits.unattributed + this.#pings.unattributed,
		};

		const response = {
			average: this.#emits.totals.average,
		};

		const peers = {
			added: [...this.#peersAdded],
			banned: [...this.#peersBanned],
			removed: [...this.#peersRemoved],
		};

		return { count, duration, peers, response };
	}

	public getEmitStatistics(): Contracts.P2P.EndpointStatistic[] {
		return this.#toEndpointStatistics(this.#emits.byEndpoint);
	}

	public getPingStatistics(): Contracts.P2P.EndpointStatistic[] {
		return this.#toEndpointStatistics(this.#pings.byEndpoint);
	}

	#toEndpointStatistics(byEndpoint: Map<string, EndpointAccumulator>): Contracts.P2P.EndpointStatistic[] {
		return [...byEndpoint.entries()].map(([endpoint, accumulator]) => ({
			count: {
				emits: accumulator.responses.count,
				peers: accumulator.peers,
				success: accumulator.responses.success,
			},
			endpoint,
			response: {
				average: accumulator.responses.average,
				max: accumulator.responses.max,
				min: accumulator.responses.min,
			},
		}));
	}

	public getPeerStatistics(): Contracts.P2P.PeerStatistic[] {
		const ips = new Set<string>([...this.#emits.byPeer.keys(), ...this.#pings.byPeer.keys()]);

		return [...ips]
			.map((ip) => ({
				emits: (this.#emits.byPeer.get(ip) ?? new PeerAccumulator()).toStatistic(),
				ip,
				pings: (this.#pings.byPeer.get(ip) ?? new PeerAccumulator()).toStatistic(),
			}))
			.sort((a, b) => b.emits.average - a.emits.average);
	}
}
