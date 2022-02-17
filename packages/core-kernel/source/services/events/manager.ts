import { EventDispatcher } from "../../contracts/kernel/events";
import { InstanceManager } from "../../support/instance-manager";
import { MemoryEventDispatcher } from "./drivers/memory";

export class EventDispatcherManager extends InstanceManager<EventDispatcher> {
	protected async createMemoryDriver(): Promise<EventDispatcher> {
		return this.app.resolve<EventDispatcher>(MemoryEventDispatcher);
	}

	protected getDefaultDriver(): string {
		return "memory";
	}
}
