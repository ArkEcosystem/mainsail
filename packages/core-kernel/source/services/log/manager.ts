import { Logger } from "../../contracts/kernel/log";
import { InstanceManager } from "../../support/instance-manager";
import { MemoryLogger } from "./drivers/memory";

export class LogManager extends InstanceManager<Logger> {
	protected async createMemoryDriver(): Promise<Logger> {
		return this.app.resolve(MemoryLogger).make();
	}

	protected getDefaultDriver(): string {
		return "memory";
	}
}
