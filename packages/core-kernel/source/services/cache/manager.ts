import { CacheStore } from "../../contracts/kernel";
import { injectable } from "../../ioc";
import { ClassManager } from "../../support/class-manager";
import { MemoryCacheStore } from "./drivers/memory";

@injectable()
export class CacheManager extends ClassManager {
	protected async createMemoryDriver<K, T>(): Promise<CacheStore<K, T>> {
		return this.app.resolve<CacheStore<K, T>>(MemoryCacheStore).make();
	}

	protected getDefaultDriver(): string {
		return "memory";
	}
}
