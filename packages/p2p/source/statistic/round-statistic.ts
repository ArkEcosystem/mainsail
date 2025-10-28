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
		fail: number;
		emit: number;
		peers: number;
	},
	response: {
		average: number;
		max: number[];
		min: number[];
	}
}

interface JoinedEmitStatistic extends Contracts.P2P.EmitStatistic {
	endpoint: string;
	ip: string;
}

const MIN_MAX_SLICE = 3;

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
				emit: emits.length,
				fail: emits.filter((emit) => !emit.success).length,
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

	public log(): void {
		const generalStatistic = this.getGeneralStatistic();
		this.logger.info(`Round statistics: ${JSON.stringify(generalStatistic)}`);

		let emitStatisticsLog = "Emit statistics by endpoint: name - peers:emits:success-fail average min[] max[]";
		const endpointStatistics = this.getEndpointStatistics();
		for (const endpointStatistic of endpointStatistics) {
			emitStatisticsLog += `\n${endpointStatistic.endpoint} - ${endpointStatistic.count.peers}:${endpointStatistic.count.emit}:${endpointStatistic.count.success}-${endpointStatistic.count.fail} ${endpointStatistic.response.average} ${endpointStatistic.response.min} ${endpointStatistic.response.max}`;
		}

		this.logger.info(emitStatisticsLog);
	}
}
