import { inject, injectable, postConstruct } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { performance } from "perf_hooks";

type GeneralRoundStatistic = {
	duration: number;
};

interface JoinedEmitStatistic extends Contracts.P2P.EmitStatistic {
	endpoint: string;
}

@injectable()
export class RoundStatistic implements Contracts.P2P.RoundStatistic {
	@inject(Identifiers.P2P.Logger)
	private readonly logger!: Contracts.P2P.Logger;

	#startTime!: number;
	#endTime!: number;

	#peers = new Map<string, JoinedEmitStatistic[]>();

	@postConstruct()
	public init() {
		this.#startTime = performance.now();
		this.#endTime = 0;
	}

	public addEmit(ip: string, endpoint: string, emitStatistic: Contracts.P2P.EmitStatistic): void {
		const peer = this.#getPeer(ip);
		peer.push({ endpoint, ...emitStatistic });
	}

	#getPeer(ip: string): JoinedEmitStatistic[] {
		if (!this.#peers.has(ip)) {
			this.#peers.set(ip, []);
		}

		return this.#peers.get(ip)!;
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
