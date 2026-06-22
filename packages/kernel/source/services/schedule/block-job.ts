import type { Contracts } from "@mainsail/contracts";

import { Events, Identifiers } from "@mainsail/constants";
import { inject, injectable } from "@mainsail/container";
import { InvalidArgumentException } from "@mainsail/exceptions";
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

			// Swallow callback failures - and any rejection from dispatching the result event -
			// so a faulty scheduled job (or a throwing event listener) can never break the
			// block.applied dispatch this runs inside of.
			try {
				await callback();

				await this.eventDispatcher.dispatch(Events.ScheduleEvent.BlockJobFinished, {
					blockCount: this.blockCount,
					executionTime: performance.now() - start,
				});
			} catch {
				await this.eventDispatcher
					.dispatch(Events.ScheduleEvent.BlockJobFailed, {
						blockCount: this.blockCount,
						executionTime: performance.now() - start,
					})
					.catch(() => {});
			}
		};

		this.eventDispatcher.listen(
			Events.BlockEvent.Applied,
			new ExecuteCallbackWhenReady(onCallback, this.blockCount),
		);
	}

	public cron(blockCount: number): this {
		// Guard against a zero/negative/non-integer count: the listener fires on
		// `number % blockCount === 0`, so `0` yields `NaN` and the job silently never runs.
		if (!Number.isInteger(blockCount) || blockCount < 1) {
			throw new InvalidArgumentException(`Block count must be a positive integer, received [${blockCount}].`);
		}

		this.blockCount = blockCount;

		return this;
	}
}
