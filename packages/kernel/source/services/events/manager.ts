import { injectable } from "@mainsail/container";
import { Contracts } from "@mainsail/contracts";

import { InstanceManager } from "../../support/instance-manager.js";
import { MemoryEventDispatcher } from "./drivers/memory.js";

@injectable()
export class EventDispatcherManager extends InstanceManager<Contracts.Kernel.EventDispatcher> {
	protected async createMemoryDriver(): Promise<Contracts.Kernel.EventDispatcher> {
		return this.app.resolve<Contracts.Kernel.EventDispatcher>(MemoryEventDispatcher);
	}

	protected getDefaultDriver(): string {
		return "memory";
	}
}
