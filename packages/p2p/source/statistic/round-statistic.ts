import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { performance } from "perf_hooks";

interface JoinedEmitStatistic extends Contracts.P2P.EmitStatistic {
	endpoint: string;
	ip: string;
}

interface JoinedPingStatistic extends Contracts.P2P.PingStatistic {
	endpoint: string;
	ip: string;
}

const MIN_MAX_SLICE = 3;

@injectable()
export class RoundStatistic implements Contracts.P2P.RoundStatistic {
	@inject(Identifiers.Application.Instance)
	private readonly app!: Contracts.Kernel.Application;

	#startTime!: number;
	#endTime!: number;
	#totalPeers!: number;
	#totalPeersBanned!: number;

	#emitStatisticsByPeer = new Map<string, JoinedEmitStatistic[]>();
	#emitStatisticsByEndpoint = new Map<string, JoinedEmitStatistic[]>();

	#pingStatisticsByPeer = new Map<string, JoinedPingStatistic[]>();
	#pingStatisticsByEndpoint = new Map<string, JoinedPingStatistic[]>();

	#peersAdded = new Set<string>();
	#peersRemoved = new Set<string>();
	#peersBanned = new Set<string>();

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
		const joined = { endpoint, ip, ...emitStatistic };

		this.#getEmitStatisticsByPeer(ip).push(joined);
		this.#getEmitStatisticsByEndpoint(endpoint).push(joined);
	}

	#getEmitStatisticsByPeer(ip: string): JoinedEmitStatistic[] {
		if (!this.#emitStatisticsByPeer.has(ip)) {
			this.#emitStatisticsByPeer.set(ip, []);
		}

		return this.#emitStatisticsByPeer.get(ip)!;
	}

	#getEmitStatisticsByEndpoint(endpoint: string): JoinedEmitStatistic[] {
		if (!this.#emitStatisticsByEndpoint.has(endpoint)) {
			this.#emitStatisticsByEndpoint.set(endpoint, []);
		}

		return this.#emitStatisticsByEndpoint.get(endpoint)!;
	}

	public addPing(ip: string, endpoint: string, pingStatistic: Contracts.P2P.PingStatistic): void {
		const joined = { endpoint, ip, ...pingStatistic };

		this.#getPingStatisticsByPeer(ip).push(joined);
		this.#getPingStatisticsByEndpoint(endpoint).push(joined);
	}

	#getPingStatisticsByPeer(ip: string): JoinedPingStatistic[] {
		if (!this.#pingStatisticsByPeer.has(ip)) {
			this.#pingStatisticsByPeer.set(ip, []);
		}

		return this.#pingStatisticsByPeer.get(ip)!;
	}

	#getPingStatisticsByEndpoint(endpoint: string): JoinedPingStatistic[] {
		if (!this.#pingStatisticsByEndpoint.has(endpoint)) {
			this.#pingStatisticsByEndpoint.set(endpoint, []);
		}

		return this.#pingStatisticsByEndpoint.get(endpoint)!;
	}

	peerAdded(ip: string): void {
		this.#peersAdded.add(ip);
	}

	peerRemoved(ip: string): void {
		if (!this.#peersBanned.has(ip)) {
			this.#peersRemoved.add(ip);
		}
	}

	peerBanned(ip: string): void {
		if (this.#peersRemoved.has(ip)) {
			this.#peersRemoved.delete(ip);
		}

		this.#peersBanned.add(ip);
	}

	public getGeneralStatistic(): Contracts.P2P.GeneralStatistic {
		const duration = Math.round(this.#endTime - this.#startTime);

		const emits = [...this.#emitStatisticsByPeer.values()].flat();
		const pings = [...this.#pingStatisticsByPeer.values()].flat();

		const emitsFailed = emits.reduce((count, emit) => count + (emit.success ? 0 : 1), 0);
		const pingsFailed = pings.reduce((count, ping) => count + (ping.success ? 0 : 1), 0);

		const count = {
			emitsFailed,
			emitsSuccess: emits.length - emitsFailed,
			peersBanned: this.#totalPeersBanned,
			peersRound: this.#emitStatisticsByPeer.size,
			peersTotal: this.#totalPeers,
			pingsFailed,
			pingsSuccess: pings.length - pingsFailed,

		};

		const response = {
			average: this.#calculateAverageResponseTime(emits),
		};

		const peers = {
			added: [...this.#peersAdded],
			banned: [...this.#peersBanned],
			removed: [...this.#peersRemoved],
		};

		return { count, duration, peers, response };
	}

	public getEmitStatistics(): Contracts.P2P.EndpointStatistic[] {
		const statistics: Contracts.P2P.EndpointStatistic[] = [];

		for (const [endpoint, emits] of this.#emitStatisticsByEndpoint.entries()) {
			const count = {
				emits: emits.length,
				peers: new Set(emits.map((emit) => emit.ip)).size,
				success: emits.filter((emit) => emit.success).length,
			};

			const response = {
				average: this.#calculateAverageResponseTime(emits),
				max: emits
					.sort((a, b) => b.responseTime - a.responseTime)
					.slice(0, MIN_MAX_SLICE)
					.map((emit) => emit.responseTime),
				min: emits
					.sort((a, b) => a.responseTime - b.responseTime)
					.slice(0, MIN_MAX_SLICE)
					.map((emit) => emit.responseTime),
			};

			statistics.push({ count, endpoint, response });
		}

		return statistics;
	}

	public getPeerStatistics(): Contracts.P2P.PeerStatistic[] {
		const statistics: Contracts.P2P.PeerStatistic[] = [];

		for (const [ip, emits] of this.#emitStatisticsByPeer.entries()) {
			const count = {
				emits: emits.length,
				success: emits.filter((emit) => emit.success).length,
			};

			const response = {
				average: this.#calculateAverageResponseTime(emits),
				max: emits
					.sort((a, b) => b.responseTime - a.responseTime)
					.slice(0, MIN_MAX_SLICE)
					.map((emit) => emit.responseTime),
				min: emits
					.sort((a, b) => a.responseTime - b.responseTime)
					.slice(0, MIN_MAX_SLICE)
					.map((emit) => emit.responseTime),
			};

			const endpointsMap = new Map<string, { name: string; responseTimes: number[] }>();
			for (const emit of emits) {
				if (!endpointsMap.has(emit.endpoint)) {
					endpointsMap.set(emit.endpoint, { name: emit.endpoint, responseTimes: [] });
				}
				endpointsMap.get(emit.endpoint)!.responseTimes.push(emit.responseTime);
			}

			const endpoints: { name: string; responseTimes: number[] }[] = [...endpointsMap.values()];
			for (const endpoint of endpoints) {
				endpoint.responseTimes.sort((a, b) => a - b);
			}

			statistics.push({ count, endpoints, ip, response });
		}

		return statistics.sort((a, b) => b.response.average - a.response.average);
	}

	#calculateAverageResponseTime(emits: JoinedEmitStatistic[]): number {
		if (emits.length === 0) {
			return 0;
		}

		const totalResponseTime = emits.reduce((sum, emit) => sum + emit.responseTime, 0);
		return Math.round(totalResponseTime / emits.length);
	}
}
