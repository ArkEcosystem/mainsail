import { Contracts } from "@mainsail/contracts";

import { InstanceManager } from "../../support/instance-manager.js";
import { MemoryLogger } from "./drivers/memory.js";

export class LogManager extends InstanceManager<Contracts.Kernel.Logger> {
	protected async createMemoryDriver(): Promise<Contracts.Kernel.Logger> {
		return this.app.resolve(MemoryLogger).make({});
	}

	protected getDefaultDriver(): string {
		return "memory";
	}
}
