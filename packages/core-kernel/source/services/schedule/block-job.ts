import { Managers } from "@arkecosystem/crypto";
import { performance } from "perf_hooks";

import { EventDispatcher } from "../../contracts/kernel/events";
import { BlockEvent, ScheduleEvent } from "../../enums";
import { Identifiers, inject, injectable } from "../../ioc";
import { Job } from "./interfaces";
import { ExecuteCallbackWhenReady } from "./listeners";

@injectable()
export class BlockJob implements Job {
	@inject(Identifiers.EventDispatcherService)
	private readonly events!: EventDispatcher;

	protected blockCount: number = 1;

	public execute(callback: Function): void {
		const onCallback = async () => {
			const start = performance.now();

			await callback();

			await this.events.dispatch(ScheduleEvent.BlockJobFinished, {
				executionTime: performance.now() - start,
				blockCount: this.blockCount,
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
		return this.cron(Managers.configManager.getMilestone().activeDelegates);
	}
}
