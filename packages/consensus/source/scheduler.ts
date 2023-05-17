import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import delay from "delay";

import { IConsensus, IScheduler } from "./types";

@injectable()
export class Scheduler implements IScheduler {
	@inject(Identifiers.Application)
	private readonly app!: Contracts.Kernel.Application;

	public async scheduleTimeoutPropose(height: number, round: number): Promise<void> {
		await delay(1000);

		await this.#getConsensus().onTimeoutPropose(height, round);
	}

	public async scheduleTimeoutPrevote(height: number, round: number): Promise<void> {}

	public async scheduleTimeoutPrecommit(height: number, round: number): Promise<void> {}

	#getConsensus(): IConsensus {
		return this.app.get<IConsensus>(Identifiers.Consensus.Service);
	}
}
