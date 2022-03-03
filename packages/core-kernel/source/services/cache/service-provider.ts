import { interfaces } from "@arkecosystem/core-container";
import { Contracts, Identifiers } from "@arkecosystem/core-contracts";

import { ServiceProvider as BaseServiceProvider } from "../../providers";
import { CacheManager } from "./manager";

export class ServiceProvider extends BaseServiceProvider {
	public async register(): Promise<void> {
		this.app.bind<CacheManager>(Identifiers.CacheManager).to(CacheManager).inSingletonScope();

		this.app
			.bind(Identifiers.CacheFactory)
			.toFactory(
				(context: interfaces.Context) =>
					async <K, T>(name?: string): Promise<Contracts.Kernel.CacheStore<K, T>> => {
						const cacheManager: CacheManager = context.container.get<CacheManager>(
							Identifiers.CacheManager,
						);

						return cacheManager.driver<Contracts.Kernel.CacheStore<K, T>>(name);
					},
			);
	}
}
