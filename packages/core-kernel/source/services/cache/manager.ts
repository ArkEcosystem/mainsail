import { injectable } from "@arkecosystem/core-container";
import { Contracts } from "@arkecosystem/core-contracts";

import { ClassManager } from "../../support/class-manager";
import { MemoryCacheStore } from "./drivers/memory";

@injectable()
export class CacheManager extends ClassManager {
	protected async createMemoryDriver<K, T>(): Promise<Contracts.Kernel.CacheStore<K, T>> {
		return this.app.resolve<Contracts.Kernel.CacheStore<K, T>>(MemoryCacheStore).make();
	}

	protected getDefaultDriver(): string {
		return "memory";
	}
}
