import { inject, injectable, postConstruct } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";

import { RoundStatistic } from "./round-statistic.js";

@injectable()
export class StatisticService implements Contracts.P2P.StatisticService {
	@inject(Identifiers.Application.Instance)
	private readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.P2P.Statistic.Logger)
	private readonly logger!: Contracts.P2P.StatisticLogger;

	readonly #roundStatistics: Map<string, RoundStatistic> = new Map();
	#currentRoundStatistic!: RoundStatistic;

	@postConstruct()
	init() {
		this.#currentRoundStatistic = this.app.resolve(RoundStatistic);
	}

	public newRound(height: number, round: number): void {
		this.#currentRoundStatistic.calculate();
		this.logger.log(this.#currentRoundStatistic);

		this.#currentRoundStatistic = this.app.resolve(RoundStatistic);
		this.#roundStatistics.set(`${height}-${round}`, this.#currentRoundStatistic);
	}

	getCurrentRoundStatistic(): RoundStatistic {
		return this.#currentRoundStatistic;
	}
}
