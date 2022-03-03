import { Contracts } from "@arkecosystem/core-contracts";

import { InstanceManager } from "../../support/instance-manager";
import { MemoryLogger } from "./drivers/memory";

export class LogManager extends InstanceManager<Contracts.Kernel.Logger> {
	protected async createMemoryDriver(): Promise<Contracts.Kernel.Logger> {
		return this.app.resolve(MemoryLogger).make();
	}

	protected getDefaultDriver(): string {
		return "memory";
	}
}
