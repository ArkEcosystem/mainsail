import { Contracts } from "@arkecosystem/core-contracts";

import { InstanceManager } from "../../support/instance-manager";
import { MemoryEventDispatcher } from "./drivers/memory";

export class EventDispatcherManager extends InstanceManager<Contracts.Kernel.EventDispatcher> {
	protected async createMemoryDriver(): Promise<Contracts.Kernel.EventDispatcher> {
		return this.app.resolve<Contracts.Kernel.EventDispatcher>(MemoryEventDispatcher);
	}

	protected getDefaultDriver(): string {
		return "memory";
	}
}
