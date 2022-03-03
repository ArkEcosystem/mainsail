import { EventEmitter } from "events";
import { decorateInjectable, injectable } from "@arkecosystem/core-container";
import { Contracts } from "@arkecosystem/core-contracts";

decorateInjectable(EventEmitter);

@injectable()
export class NullQueue extends EventEmitter implements Contracts.Kernel.Queue {
	public async make(): Promise<Contracts.Kernel.Queue> {
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

	public async push(job: Contracts.Kernel.QueueJob): Promise<void> {
		return;
	}

	public async later(delay: number, job: Contracts.Kernel.QueueJob): Promise<void> {
		return;
	}

	public async bulk(jobs: Contracts.Kernel.QueueJob[]): Promise<void> {
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
