import { injectable, postConstruct } from "@mainsail/container";
import { Contracts } from "@mainsail/contracts";
import { performance } from "perf_hooks";

interface JoinedEmitStatistic extends Contracts.P2P.EmitStatistic {
	endpoint: string;
	ip: string;
}

const MIN_MAX_SLICE = 3;

@injectable()
export class RoundStatistic implements Contracts.P2P.RoundStatistic {
	#startTime!: number;
	#endTime!: number;

	#emitStatisticsByPeer = new Map<string, JoinedEmitStatistic[]>();
	#emitStatisticsByEndpoint = new Map<string, JoinedEmitStatistic[]>();

	@postConstruct()
	public init() {
		this.#startTime = performance.now();
		this.#endTime = 0;
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

	public calculate(): void {
		this.#endTime = performance.now();
	}

	public getGeneralStatistic(): Contracts.P2P.GeneralStatistic {
		const duration = Math.round(this.#endTime - this.#startTime);

		const emits = [...this.#emitStatisticsByPeer.values()].flat();

		const count = {
			roundEmits: emits.length,
			roundPeers: this.#emitStatisticsByPeer.size,
			totalPeers: this.#emitStatisticsByPeer.size,
		}

		const response = {
			average: Math.round((emits.reduce((sum, emit) => sum + emit.responseTime, 0) / emits.length)),
		};

		return { count, duration, response };
	}

	public getEndpointStatistics(): Contracts.P2P.EndpointStatistic[] {
		const statistics: Contracts.P2P.EndpointStatistic[] = [];

		for (const [endpoint, emits] of this.#emitStatisticsByEndpoint.entries()) {
			const count = {
				emits: emits.length,
				peers: new Set(emits.map((emit) => emit.ip)).size,
				success: emits.filter((emit) => emit.success).length,
			};

			const response = {
				average: Math.round((emits.reduce((sum, emit) => sum + emit.responseTime, 0) / emits.length)),
				max: emits
					.sort((a, b) => b.responseTime - a.responseTime)
					.slice(0, MIN_MAX_SLICE)
					.map((emit) => emit.responseTime),
				min: emits
					.sort((a, b) => a.responseTime - b.responseTime)
					.slice(0, MIN_MAX_SLICE)
					.map((emit) => emit.responseTime),
			}

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

				average: Math.round((emits.reduce((sum, emit) => sum + emit.responseTime, 0) / emits.length)),
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
}
