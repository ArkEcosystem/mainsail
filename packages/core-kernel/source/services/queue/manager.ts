import { injectable } from "@mainsail/core-container";
import { Contracts } from "@mainsail/core-contracts";

import { ClassManager } from "../../support/class-manager";
import { MemoryQueue } from "./drivers/memory";

@injectable()
export class QueueManager extends ClassManager {
	protected async createMemoryDriver(): Promise<Contracts.Kernel.Queue> {
		return this.app.resolve<Contracts.Kernel.Queue>(MemoryQueue).make();
	}

	protected getDefaultDriver(): string {
		return "memory";
	}
}
