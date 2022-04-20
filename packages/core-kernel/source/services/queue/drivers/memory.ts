import { decorateInjectable, inject, injectable } from "@arkecosystem/core-container";
import { Contracts, Identifiers } from "@arkecosystem/core-contracts";
import { EventEmitter } from "events";
import { performance } from "perf_hooks";

import { QueueEvent } from "../../../enums";

decorateInjectable(EventEmitter);

@injectable()
export class MemoryQueue extends EventEmitter implements Contracts.Kernel.Queue {
	@inject(Identifiers.EventDispatcherService)
	private readonly events!: Contracts.Kernel.EventDispatcher;

	@inject(Identifiers.LogService)
	private readonly logger!: Contracts.Kernel.Logger;

	#jobs: Contracts.Kernel.QueueJob[] = [];

	#running = false;
	#started = false;

	#onProcessedCallbacks: (() => void)[] = [];

	public constructor() {
		super();
		this.setMaxListeners(0);
	}

	public async make(): Promise<Contracts.Kernel.Queue> {
		return this;
	}

	public async start(): Promise<void> {
		this.#started = true;

		// eslint-disable-next-line @typescript-eslint/no-floating-promises
		this.#processJobs();
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
		this.#jobs = [];
	}

	public async push(job: Contracts.Kernel.QueueJob): Promise<void> {
		this.#jobs.push(job);

		// eslint-disable-next-line @typescript-eslint/no-floating-promises
		this.#processJobs();
	}

	public async later(delay: number, job: Contracts.Kernel.QueueJob): Promise<void> {
		setTimeout(() => this.push(job), delay);
	}

	public async bulk(jobs: Contracts.Kernel.QueueJob[]): Promise<void> {
		for (const job of jobs) {
			this.#jobs.push(job);
		}
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

		while (this.#jobs.length > 0) {
			if (!this.#started) {
				break;
			}

			this.#running = true;

			const job = this.#jobs.shift()!;

			const start = performance.now();
			try {
				const data = await job.handle();

				await this.events.dispatch(QueueEvent.Finished, {
					data: data,
					driver: "memory",
					executionTime: performance.now() - start,
				});

				this.emit("jobDone", job, data);
			} catch (error) {
				await this.events.dispatch(QueueEvent.Failed, {
					driver: "memory",
					error: error,
					executionTime: performance.now() - start,
				});

				this.logger.warning(`Queue error occurs when handling job: ${job}`);

				this.emit("jobError", job, error);
			}
		}

		this.#running = false;

		this.#resolveOnProcessed();

		if (this.#jobs.length === 0) {
			this.emit("drain");
		}
	}
}
