import { Kernel } from "@arkecosystem/core-contracts";

import { InstanceManager } from "../../support/instance-manager";
import { MemoryLogger } from "./drivers/memory";

export class LogManager extends InstanceManager<Kernel.Logger> {
	protected async createMemoryDriver(): Promise<Kernel.Logger> {
		return this.app.resolve(MemoryLogger).make();
	}

	protected getDefaultDriver(): string {
		return "memory";
	}
}
