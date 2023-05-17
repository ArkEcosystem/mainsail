import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import delay from "delay";

import { IConsensus, IScheduler } from "./types";

@injectable()
export class Scheduler implements IScheduler {
	@inject(Identifiers.Application)
	private readonly app!: Contracts.Kernel.Application;

	public async scheduleTimeoutPropose(height: number, round: number): Promise<void> {
		await this.#wait(round);
		await this.#getConsensus().onTimeoutPropose(height, round);
	}

	public async scheduleTimeoutPrevote(height: number, round: number): Promise<void> {
		await this.#wait(round);
		await this.#getConsensus().onTimeoutPrevote(height, round);
	}

	public async scheduleTimeoutPrecommit(height: number, round: number): Promise<void> {
		await this.#wait(round);
		await this.#getConsensus().onTimeoutPrecommit(height, round);
	}

	async #wait(round: number) {
		// TODO: Find a better way to calculate the delay
		await delay((round + 1) * 1000);
	}

	#getConsensus(): IConsensus {
		return this.app.get<IConsensus>(Identifiers.Consensus.Service);
	}
}
