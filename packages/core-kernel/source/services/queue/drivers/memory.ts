import { EventEmitter } from "events";
import { performance } from "perf_hooks";

import { EventDispatcher } from "../../../contracts/kernel/events";
import { Logger } from "../../../contracts/kernel/log";
import { Queue, QueueJob } from "../../../contracts/kernel/queue";
import { QueueEvent } from "../../../enums";
import { decorateInjectable, Identifiers, inject, injectable } from "../../../ioc";

decorateInjectable(EventEmitter);

@injectable()
export class MemoryQueue extends EventEmitter implements Queue {
	@inject(Identifiers.EventDispatcherService)
	private readonly events!: EventDispatcher;

	@inject(Identifiers.LogService)
	private readonly logger!: Logger;

	private jobs: QueueJob[] = [];

	private running: boolean = false;
	private started: boolean = false;

	private onProcessedCallbacks: (() => void)[] = [];

	public constructor() {
		super();
		this.setMaxListeners(0);
	}

	public async make(): Promise<Queue> {
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

	public async push(job: QueueJob): Promise<void> {
		this.jobs.push(job);

		this.processJobs();
	}

	public async later(delay: number, job: QueueJob): Promise<void> {
		setTimeout(() => this.push(job), delay);
	}

	public async bulk(jobs: QueueJob[]): Promise<void> {
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
		while (this.onProcessedCallbacks.length) {
			const onProcessed = this.onProcessedCallbacks.shift()!;

			onProcessed();
		}
	}

	private async processJobs(): Promise<void> {
		// Prevent entering if already processing
		if (this.isRunning()) {
			return;
		}

		while (this.jobs.length) {
			if (!this.started) {
				break;
			}

			this.running = true;

			const job = this.jobs.shift()!;

			const start = performance.now();
			try {
				const data = await job.handle();

				await this.events.dispatch(QueueEvent.Finished, {
					driver: "memory",
					executionTime: performance.now() - start,
					data: data,
				});

				this.emit("jobDone", job, data);
			} catch (error) {
				await this.events.dispatch(QueueEvent.Failed, {
					driver: "memory",
					executionTime: performance.now() - start,
					error: error,
				});

				this.logger.warning(`Queue error occurs when handling job: ${job}`);

				this.emit("jobError", job, error);
			}
		}

		this.running = false;

		this.resolveOnProcessed();

		if (!this.jobs.length) {
			this.emit("drain");
		}
	}
}
