import { Kernel } from "@arkecosystem/core-contracts";
import { EventEmitter } from "events";

import { decorateInjectable, injectable } from "../../../ioc";

decorateInjectable(EventEmitter);

@injectable()
export class NullQueue extends EventEmitter implements Kernel.Queue {
	public async make(): Promise<Kernel.Queue> {
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

	public async push(job: Kernel.QueueJob): Promise<void> {
		return;
	}

	public async later(delay: number, job: Kernel.QueueJob): Promise<void> {
		return;
	}

	public async bulk(jobs: Kernel.QueueJob[]): Promise<void> {
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
