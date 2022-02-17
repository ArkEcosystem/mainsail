import { EventEmitter } from "events";

export interface QueueJob {
	handle(): Promise<void>;
}

export interface Queue extends EventEmitter {
	make(): Promise<Queue>;

	start(): Promise<void>;

	stop(): Promise<void>;

	pause(): Promise<void>;

	resume(): Promise<void>;

	clear(): Promise<void>;

	push(job: QueueJob): Promise<void>;

	later(delay: number, job: QueueJob): Promise<void>;

	bulk(jobs: QueueJob[]): Promise<void>;

	size(): number;

	isStarted(): boolean;

	isRunning(): boolean;
}
