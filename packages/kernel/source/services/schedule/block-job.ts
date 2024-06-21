import { inject, injectable } from "@mainsail/container";
import { Contracts, Events, Identifiers } from "@mainsail/contracts";
import { performance } from "perf_hooks";

import { Job } from "./interfaces.js";
import { ExecuteCallbackWhenReady } from "./listeners.js";

@injectable()
export class BlockJob implements Job {
	@inject(Identifiers.Services.EventDispatcher.Service)
	private readonly events!: Contracts.Kernel.EventDispatcher;

	@inject(Identifiers.Cryptography.Configuration)
	private readonly configuration!: Contracts.Crypto.Configuration;

	protected blockCount = 1;

	public execute(callback: Function): void {
		const onCallback = async () => {
			const start = performance.now();

			await callback();

			await this.events.dispatch(Events.ScheduleEvent.BlockJobFinished, {
				blockCount: this.blockCount,
				executionTime: performance.now() - start,
			});
		};

		this.events.listen(Events.BlockEvent.Received, new ExecuteCallbackWhenReady(onCallback, this.blockCount));
	}

	public cron(blockCount: number): this {
		this.blockCount = blockCount;

		return this;
	}

	public everyBlock(): this {
		return this.cron(1);
	}

	public everyFiveBlocks(): this {
		return this.cron(5);
	}

	public everyTenBlocks(): this {
		return this.cron(10);
	}

	public everyFifteenBlocks(): this {
		return this.cron(15);
	}

	public everyThirtyBlocks(): this {
		return this.cron(30);
	}

	public everyRound(): this {
		// TODO: rebuild on milestone change
		return this.cron(this.configuration.getMilestone(1).activeValidators);
	}
}
