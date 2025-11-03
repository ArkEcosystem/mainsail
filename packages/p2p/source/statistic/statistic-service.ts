import { inject, injectable, postConstruct } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";

import { RoundStatistic } from "./round-statistic.js";

// TODO: Read from config
const MAX_ROUND_STATISTICS = 100;

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
		this.#currentRoundStatistic.start();
	}

	public newRound(height: number, round: number): void {
		this.#currentRoundStatistic.stop();
		this.logger.log(this.#currentRoundStatistic);

		this.#currentRoundStatistic = this.app.resolve(RoundStatistic);
		this.#currentRoundStatistic.start();

		this.#roundStatistics.set(`${height}-${round}`, this.#currentRoundStatistic);
		// Remove first if we have more than 100 rounds stored
		if (this.#roundStatistics.size > MAX_ROUND_STATISTICS) {
			const firstKey = this.#roundStatistics.keys().next().value!;
			this.#roundStatistics.delete(firstKey);
		}
	}

	getCurrentRoundStatistic(): RoundStatistic {
		return this.#currentRoundStatistic;
	}
}
