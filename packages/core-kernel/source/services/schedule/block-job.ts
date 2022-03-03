import { performance } from "perf_hooks";
import { inject, injectable } from "@arkecosystem/core-container";
import { Contracts, Identifiers } from "@arkecosystem/core-contracts";

import { BlockEvent, ScheduleEvent } from "../../enums";
import { Job } from "./interfaces";
import { ExecuteCallbackWhenReady } from "./listeners";

@injectable()
export class BlockJob implements Job {
	@inject(Identifiers.EventDispatcherService)
	private readonly events: Contracts.Kernel.EventDispatcher;

	@inject(Identifiers.Cryptography.Configuration)
	private readonly configuration: Contracts.Crypto.IConfiguration;

	protected blockCount = 1;

	public execute(callback: Function): void {
		const onCallback = async () => {
			const start = performance.now();

			await callback();

			await this.events.dispatch(ScheduleEvent.BlockJobFinished, {
				blockCount: this.blockCount,
				executionTime: performance.now() - start,
			});
		};

		this.events.listen(BlockEvent.Received, new ExecuteCallbackWhenReady(onCallback, this.blockCount));
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
		return this.cron(this.configuration.getMilestone().activeValidators);
	}
}
