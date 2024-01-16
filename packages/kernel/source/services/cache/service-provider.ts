import { interfaces } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";

import { ServiceProvider as BaseServiceProvider } from "../../providers";
import { CacheManager } from "./manager";

export class ServiceProvider extends BaseServiceProvider {
	public async register(): Promise<void> {
		this.app.bind<CacheManager>(Identifiers.Services.Cache.Manager).to(CacheManager).inSingletonScope();

		this.app
			.bind(Identifiers.Services.Cache.Factory)
			.toFactory(
				(context: interfaces.Context) =>
					async <K, T>(name?: string): Promise<Contracts.Kernel.CacheStore<K, T>> => {
						const cacheManager: CacheManager = context.container.get<CacheManager>(
							Identifiers.Services.Cache.Manager,
						);

						return cacheManager.driver<Contracts.Kernel.CacheStore<K, T>>(name);
					},
			);
	}
}
