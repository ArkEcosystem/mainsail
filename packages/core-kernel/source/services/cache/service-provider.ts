import { Kernel } from "@arkecosystem/core-contracts";
import { Identifiers, interfaces } from "../../ioc";
import { ServiceProvider as BaseServiceProvider } from "../../providers";
import { CacheManager } from "./manager";

export class ServiceProvider extends BaseServiceProvider {
	public async register(): Promise<void> {
		this.app.bind<CacheManager>(Identifiers.CacheManager).to(CacheManager).inSingletonScope();

		this.app
			.bind(Identifiers.CacheFactory)
			.toFactory(
				(context: interfaces.Context) =>
					async <K, T>(name?: string): Promise<Kernel.CacheStore<K, T>> => {
						const cacheManager: CacheManager = context.container.get<CacheManager>(
							Identifiers.CacheManager,
						);

						return cacheManager.driver<Kernel.CacheStore<K, T>>(name);
					},
			);
	}
}
