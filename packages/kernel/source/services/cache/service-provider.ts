import { injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";

import { ServiceProvider as BaseServiceProvider } from "../../providers/index.js";
import { CacheManager } from "./manager.js";

@injectable()
export class ServiceProvider extends BaseServiceProvider {
	public async register(): Promise<void> {
		this.app.bind<CacheManager>(Identifiers.Services.Cache.Manager).to(CacheManager).inSingletonScope();

		this.app
			.bind<
				<K, T>(name?: string) => Promise<Contracts.Kernel.CacheStore<K, T>>
			>(Identifiers.Services.Cache.Factory)
			.toFactory(
				(context: Contracts.Kernel.Container.ResolutionContext) =>
					async <K, T>(name?: string): Promise<Contracts.Kernel.CacheStore<K, T>> => {
						const cacheManager: CacheManager = context.get<CacheManager>(
							Identifiers.Services.Cache.Manager,
						);

						return cacheManager.driver<Contracts.Kernel.CacheStore<K, T>>(name);
					},
			);
	}
}
