import { inject, injectable, postConstruct } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { performance } from "perf_hooks";

type GeneralRoundStatistic = {
	duration: number;
	roundPeersCount: number;
	roundEmitCount: number;
};

type EndpointStatistic = {
	endpoint: string;
	count: {
		success: number;
		emits: number;
		peers: number;
	},
	response: {
		average: number;
		max: number[];
		min: number[];
	}
}

type PeerStatistic = {
	ip: string;
	count: {
		success: number;
		emits: number;
	},
	response: {
		average: number;
		max: number[];
		min: number[];
	}
	endpoints: {
		name: string;
		responseTimes: number[];
	}[];
}

interface JoinedEmitStatistic extends Contracts.P2P.EmitStatistic {
	endpoint: string;
	ip: string;
}

const MIN_MAX_SLICE = 3;
const LOG_EXTRA_PEER_STATISTIC = true;

@injectable()
export class RoundStatistic implements Contracts.P2P.RoundStatistic {
	@inject(Identifiers.P2P.Logger)
	private readonly logger!: Contracts.P2P.Logger;

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

	public getGeneralStatistic(): GeneralRoundStatistic {
		const duration = this.#endTime - this.#startTime;

		const roundPeersCount = this.#emitStatisticsByPeer.size;
		const roundEmitCount = [...this.#emitStatisticsByPeer.values()].flat().length;

		return { duration, roundEmitCount, roundPeersCount };
	}

	public getEndpointStatistics(): EndpointStatistic[] {
		const statistics: EndpointStatistic[] = [];

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

	public getPeerStatistics(): PeerStatistic[] {
		const statistics: PeerStatistic[] = [];

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

	public log(): void {
		// General
		const generalStatistic = this.getGeneralStatistic();
		this.logger.info(`Round statistics: ${JSON.stringify(generalStatistic)}`);

		// Endpoints
		const endpointStatistics = this.getEndpointStatistics();
		let emitStatisticsLog = "Emit statistics by endpoint: \nname \tpeers success/emits\taverage\tmin[] max[]";
		for (const endpointStatistic of endpointStatistics) {
			emitStatisticsLog += `\n${endpointStatistic.endpoint}\t${endpointStatistic.count.peers}:${endpointStatistic.count.success}/${endpointStatistic.count.emits}\t${endpointStatistic.response.average}\t[${endpointStatistic.response.min}]\t[${endpointStatistic.response.max}]`;
		}

		if (emitStatisticsLog.length > 0) {
			this.logger.info(emitStatisticsLog);
		}

		// Peers
		const peerStatistics = this.getPeerStatistics();
		let peerStatisticsLog = "Emit statistics by peer: \nip \tsuccess/emits\taverage\tmin[] max[]";
		for (const peerStatistic of peerStatistics) {
			peerStatisticsLog += `\n${peerStatistic.ip}\t${peerStatistic.count.success}/${peerStatistic.count.emits}\t${peerStatistic.response.average}\t[${peerStatistic.response.min}]\t[${peerStatistic.response.max}]`;

			if (LOG_EXTRA_PEER_STATISTIC) {
				for (const endpoint of peerStatistic.endpoints) {
					peerStatisticsLog += `\n  ${endpoint.name}: [${endpoint.responseTimes}]`;
				}
			}

			if (peerStatisticsLog.length > 0) {
				this.logger.info(peerStatisticsLog);
			}
		}
	}
}
