import { injectable } from "@mainsail/container";
import { Contracts } from "@mainsail/contracts";

import { ClassManager } from "../../support/class-manager.js";
import { MemoryCacheStore } from "./drivers/memory.js";

@injectable()
export class CacheManager extends ClassManager {
	protected async createMemoryDriver<K, T>(): Promise<Contracts.Kernel.CacheStore<K, T>> {
		return this.app.resolve<Contracts.Kernel.CacheStore<K, T>>(MemoryCacheStore).make();
	}

	protected getDefaultDriver(): string {
		return "memory";
	}
}
