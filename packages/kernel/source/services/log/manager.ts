import { injectable } from "@mainsail/container";
import type { Contracts } from "@mainsail/contracts";

import { InstanceManager } from "../../support/instance-manager.js";
import { MemoryLogger, WorkerLogger } from "./drivers/index.js";

@injectable()
export class LogManager extends InstanceManager<Contracts.Kernel.Logger> {
	protected async createMemoryDriver(): Promise<Contracts.Kernel.Logger> {
		return this.app.resolve(MemoryLogger).make({});
	}

	protected async createWorkerDriver(): Promise<Contracts.Kernel.Logger> {
		return this.app.resolve(WorkerLogger).make({});
	}

	protected getDefaultDriver(): string {
		if (this.app.isWorker()) {
			return "worker";
		}

		return "memory";
	}
}
