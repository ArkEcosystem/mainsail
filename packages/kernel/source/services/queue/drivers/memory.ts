import type { Contracts } from "@mainsail/contracts";

import { Events, Identifiers } from "@mainsail/constants";
import { inject, injectable } from "@mainsail/container";
import { ensureError } from "@mainsail/utils";
import { EventEmitter } from "events";
import { performance } from "perf_hooks";

@injectable()
export class MemoryQueue extends EventEmitter implements Contracts.Kernel.Queue {
	@inject(Identifiers.Services.EventDispatcher.Service)
	private readonly events!: Contracts.Kernel.EventDispatcher;

	@inject(Identifiers.Services.Log.Service)
	private readonly logger!: Contracts.Kernel.Logger;

	#jobs: Contracts.Kernel.QueueJob[] = [];

	#running = false;
	#started = false;

	#onProcessedCallbacks: (() => void)[] = [];

	readonly #timers: Set<ReturnType<typeof setTimeout>> = new Set();

	public constructor() {
		super();
		this.setMaxListeners(0);
	}

	public async make(): Promise<Contracts.Kernel.Queue> {
		return this;
	}

	public async start(): Promise<void> {
		this.#started = true;

		void this.#processJobs();
	}

	public async stop(): Promise<void> {
		this.#started = false;

		const promise = this.#waitUntilProcessed();

		await this.clear();

		return promise;
	}

	public async pause(): Promise<void> {
		this.#started = false;

		await this.#waitUntilProcessed();
	}

	public async resume(): Promise<void> {
		await this.start();
	}

	public async clear(): Promise<void> {
		for (const timer of this.#timers) {
			clearTimeout(timer);
		}
		this.#timers.clear();

		this.#jobs = [];
	}

	public async drain(): Promise<void> {
		while (this.#running || this.#jobs.length > 0) {
			if (this.#started) {
				void this.#processJobs();
			} else {
				await this.start();
			}

			await this.#waitUntilProcessed();
		}
	}

	public async push(job: Contracts.Kernel.QueueJob): Promise<void> {
		this.#jobs.push(job);

		void this.#processJobs();
	}

	public async later(delay: number, job: Contracts.Kernel.QueueJob): Promise<void> {
		const timer = setTimeout(() => {
			this.#timers.delete(timer);

			void this.push(job);
		}, delay);

		this.#timers.add(timer);
	}

	public async bulk(jobs: Contracts.Kernel.QueueJob[]): Promise<void> {
		for (const job of jobs) {
			this.#jobs.push(job);
		}

		void this.#processJobs();
	}

	public size(): number {
		return this.#jobs.length;
	}

	public isStarted(): boolean {
		return this.#started;
	}

	public isRunning(): boolean {
		return this.#running;
	}

	#waitUntilProcessed(): Promise<void> {
		return new Promise((resolve) => {
			if (this.#running) {
				const onProcessed = () => {
					resolve();
				};

				this.#onProcessedCallbacks.push(onProcessed);
			} else {
				resolve();
			}
		});
	}

	#resolveOnProcessed(): void {
		while (this.#onProcessedCallbacks.length > 0) {
			const onProcessed = this.#onProcessedCallbacks.shift()!;

			onProcessed();
		}
	}

	async #processJobs(): Promise<void> {
		// Prevent entering if already processing
		if (this.isRunning()) {
			return;
		}

		this.#running = true;

		try {
			while (this.#jobs.length > 0) {
				if (!this.#started) {
					break;
				}

				const job = this.#jobs.shift()!;

				const start = performance.now();
				try {
					const data = await job.handle();

					await this.events.dispatch(Events.QueueEvent.Finished, {
						data: data,
						driver: "memory",
						executionTime: performance.now() - start,
					});

					this.emit("jobDone", job, data);
				} catch (rawError) {
					const error = ensureError(rawError);
					await this.events.dispatch(Events.QueueEvent.Failed, {
						driver: "memory",
						error: error,
						executionTime: performance.now() - start,
					});

					this.logger.warn(`Queue error occurred while handling job: ${error.message}`);

					this.emit("jobError", job, error);
				}
			}
		} catch (rawError) {
			this.logger.warn(`Queue error occurred while processing jobs: ${ensureError(rawError).message}`);
		} finally {
			this.#running = false;

			this.#resolveOnProcessed();

			if (this.#jobs.length === 0) {
				this.emit("drain");
			}
		}
	}
}
