import type { Contracts } from "@mainsail/contracts";

import { Events, Identifiers } from "@mainsail/constants";
import { inject, injectable } from "@mainsail/container";
import { performance } from "perf_hooks";

import { Job } from "./interfaces.js";
import { ExecuteCallbackWhenReady } from "./listeners.js";

@injectable()
export class BlockJob implements Job {
	@inject(Identifiers.Services.EventDispatcher.Service)
	private readonly eventDispatcher!: Contracts.Kernel.EventDispatcher<Contracts.Crypto.BlockData>;

	protected blockCount = 1;

	public execute(callback: () => void | Promise<void>): void {
		const onCallback = async () => {
			const start = performance.now();

			// Swallow callback failures so a faulty scheduled job cannot break the block.applied dispatch.
			try {
				await callback();

				await this.eventDispatcher.dispatch(Events.ScheduleEvent.BlockJobFinished, {
					blockCount: this.blockCount,
					executionTime: performance.now() - start,
				});
			} catch {
				await this.eventDispatcher.dispatch(Events.ScheduleEvent.BlockJobFailed, {
					blockCount: this.blockCount,
					executionTime: performance.now() - start,
				});
			}
		};

		this.eventDispatcher.listen(
			Events.BlockEvent.Applied,
			new ExecuteCallbackWhenReady(onCallback, this.blockCount),
		);
	}

	public cron(blockCount: number): this {
		this.blockCount = blockCount;

		return this;
	}
}
