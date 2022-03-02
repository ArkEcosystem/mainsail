import { Kernel } from "@arkecosystem/core-contracts";

import { InstanceManager } from "../../support/instance-manager";
import { MemoryEventDispatcher } from "./drivers/memory";

export class EventDispatcherManager extends InstanceManager<Kernel.EventDispatcher> {
	protected async createMemoryDriver(): Promise<Kernel.EventDispatcher> {
		return this.app.resolve<Kernel.EventDispatcher>(MemoryEventDispatcher);
	}

	protected getDefaultDriver(): string {
		return "memory";
	}
}
