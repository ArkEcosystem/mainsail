import { EventEmitter } from "events";
import { decorateInjectable, inject, injectable } from "@arkecosystem/core-container";
import { Identifiers, Kernel } from "@arkecosystem/core-contracts";
import { performance } from "perf_hooks";

import { QueueEvent } from "../../../enums";

decorateInjectable(EventEmitter);

@injectable()
export class MemoryQueue extends EventEmitter implements Kernel.Queue {
	@inject(Identifiers.EventDispatcherService)
	private readonly events!: Kernel.EventDispatcher;

	@inject(Identifiers.LogService)
	private readonly logger!: Kernel.Logger;

	private jobs: Kernel.QueueJob[] = [];

	private running = false;
	private started = false;

	private onProcessedCallbacks: (() => void)[] = [];

	public constructor() {
		super();
		this.setMaxListeners(0);
	}

	public async make(): Promise<Kernel.Queue> {
		return this;
	}

	public async start(): Promise<void> {
		this.started = true;

		this.processJobs();
	}

	public async stop(): Promise<void> {
		this.started = false;

		const promise = this.waitUntilProcessed();

		await this.clear();

		return promise;
	}

	public async pause(): Promise<void> {
		this.started = false;

		await this.waitUntilProcessed();
	}

	public async resume(): Promise<void> {
		await this.start();
	}

	public async clear(): Promise<void> {
		this.jobs = [];
	}

	public async push(job: Kernel.QueueJob): Promise<void> {
		this.jobs.push(job);

		this.processJobs();
	}

	public async later(delay: number, job: Kernel.QueueJob): Promise<void> {
		setTimeout(() => this.push(job), delay);
	}

	public async bulk(jobs: Kernel.QueueJob[]): Promise<void> {
		for (const job of jobs) {
			this.jobs.push(job);
		}
	}

	public size(): number {
		return this.jobs.length;
	}

	public isStarted(): boolean {
		return this.started;
	}

	public isRunning(): boolean {
		return this.running;
	}

	private waitUntilProcessed(): Promise<void> {
		return new Promise((resolve) => {
			if (this.running) {
				const onProcessed = () => {
					resolve();
				};

				this.onProcessedCallbacks.push(onProcessed);
			} else {
				resolve();
			}
		});
	}

	private resolveOnProcessed(): void {
		while (this.onProcessedCallbacks.length > 0) {
			const onProcessed = this.onProcessedCallbacks.shift()!;

			onProcessed();
		}
	}

	private async processJobs(): Promise<void> {
		// Prevent entering if already processing
		if (this.isRunning()) {
			return;
		}

		while (this.jobs.length > 0) {
			if (!this.started) {
				break;
			}

			this.running = true;

			const job = this.jobs.shift()!;

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

		this.running = false;

		this.resolveOnProcessed();

		if (this.jobs.length === 0) {
			this.emit("drain");
		}
	}
}
