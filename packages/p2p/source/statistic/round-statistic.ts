import { inject, injectable, postConstruct } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { performance } from "perf_hooks";

type GeneralRoundStatistic = {
	duration: number;
};

@injectable()
export class RoundStatistic implements Contracts.P2P.RoundStatistic {
	@inject(Identifiers.P2P.Logger)
	private readonly logger!: Contracts.P2P.Logger;

	#startTime!: number;
	#endTime!: number;

	@postConstruct()
	public init() {
		this.#startTime = performance.now();
		this.#endTime = 0;
	}

	public addPeerResponseTime(ip: string, endpoint: string, emitStatistic: Contracts.P2P.EmitStatistic): void {
		// Here you can store or process the response time per peer and endpoint if needed
	}

	public calculate(): void {
		this.#endTime = performance.now();
	}

	public getGeneralStatistic(): GeneralRoundStatistic {
		const duration = this.#endTime - this.#startTime;
		return { duration };
	}

	public log(): void {
		const generalStatistic = this.getGeneralStatistic();
		this.logger.info(`Round statistics: ${JSON.stringify(generalStatistic)}`);
	}
}
