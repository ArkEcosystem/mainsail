import { Events, Identifiers } from "@mainsail/constants";
import { inject, injectable } from "@mainsail/container";
import type { Contracts } from "@mainsail/contracts";
import { performance } from "perf_hooks";

import { Job } from "./interfaces.js";
import { ExecuteCallbackWhenReady } from "./listeners.js";

@injectable()
export class BlockJob implements Job {
	@inject(Identifiers.Services.EventDispatcher.Service)
	private readonly eventDispatcher!: Contracts.Kernel.EventDispatcher<Contracts.Crypto.BlockData>;

	protected blockCount = 1;

	public execute(callback: () => void): void {
		const onCallback = async () => {
			const start = performance.now();

			callback();

			await this.eventDispatcher.dispatch(Events.ScheduleEvent.BlockJobFinished, {
				blockCount: this.blockCount,
				executionTime: performance.now() - start,
			});
		};

		this.eventDispatcher.listen(Events.BlockEvent.Received, new ExecuteCallbackWhenReady(onCallback, this.blockCount));
	}

	public cron(blockCount: number): this {
		this.blockCount = blockCount;

		return this;
	}
}
