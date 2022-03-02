import { Kernel } from "@arkecosystem/core-contracts";

import { injectable } from "../../ioc";
import { ClassManager } from "../../support/class-manager";
import { MemoryQueue } from "./drivers/memory";

@injectable()
export class QueueManager extends ClassManager {
	protected async createMemoryDriver(): Promise<Kernel.Queue> {
		return this.app.resolve<Kernel.Queue>(MemoryQueue).make();
	}

	protected getDefaultDriver(): string {
		return "memory";
	}
}
