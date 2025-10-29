import { inject, injectable, postConstruct } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";

import { RoundStatistic } from "./round-statistic.js";

@injectable()
export class StatisticService implements Contracts.P2P.StatisticService {
	@inject(Identifiers.Application.Instance)
	private readonly app!: Contracts.Kernel.Application;

	readonly #roundStatistics: Map<string, RoundStatistic> = new Map();
	#currentRoundStatistic!: RoundStatistic;

	@postConstruct()
	init() {
		this.#currentRoundStatistic = this.app.resolve(RoundStatistic);
	}

	public newRound(height: number, round: number): void {
		this.#currentRoundStatistic.calculate();
		// this.#currentRoundStatistic.log();

		this.#currentRoundStatistic = this.app.resolve(RoundStatistic);
		this.#roundStatistics.set(`${height}-${round}`, this.#currentRoundStatistic);
	}

	getCurrentRoundStatistic(): RoundStatistic {
		return this.#currentRoundStatistic;
	}
}
