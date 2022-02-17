import { EventEmitter } from "events";

import { Queue, QueueJob } from "../../../contracts/kernel/queue";
import { decorateInjectable, injectable } from "../../../ioc";

decorateInjectable(EventEmitter);

@injectable()
export class NullQueue extends EventEmitter implements Queue {
	public async make(): Promise<Queue> {
		return this;
	}

	public async start(): Promise<void> {
		return;
	}

	public async stop(): Promise<void> {
		return;
	}

	public async pause(): Promise<void> {
		return;
	}

	public async resume(): Promise<void> {
		return;
	}

	public async clear(): Promise<void> {
		return;
	}

	public async push(job: QueueJob): Promise<void> {
		return;
	}

	public async later(delay: number, job: QueueJob): Promise<void> {
		return;
	}

	public async bulk(jobs: QueueJob[]): Promise<void> {
		return;
	}

	public size(): number {
		return 0;
	}

	public isStarted(): boolean {
		return false;
	}

	public isRunning(): boolean {
		return false;
	}
}
