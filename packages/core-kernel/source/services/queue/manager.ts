import { Queue } from "../../contracts/kernel/queue";
import { injectable } from "../../ioc";
import { ClassManager } from "../../support/class-manager";
import { MemoryQueue } from "./drivers/memory";

@injectable()
export class QueueManager extends ClassManager {
	protected async createMemoryDriver(): Promise<Queue> {
		return this.app.resolve<Queue>(MemoryQueue).make();
	}

	protected getDefaultDriver(): string {
		return "memory";
	}
}
