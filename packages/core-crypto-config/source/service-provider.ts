import { BINDINGS, IBlockJson, IConfiguration, Network, NetworkConfig } from "@arkecosystem/core-crypto-contracts";
import { Container, Providers } from "@arkecosystem/core-kernel";

import { Configuration } from "./configuration";

export class ServiceProvider extends Providers.ServiceProvider {
	public async register(): Promise<void> {
		this.app.bind(BINDINGS.Configuration).to(Configuration).inSingletonScope();

		// if (this.app.isBound(Container.Identifiers.Crypto)) {
		const config: NetworkConfig = this.fromConfigRepository();

		this.app.get<IConfiguration>(BINDINGS.Configuration).setConfig(config);

		this.app.bind<NetworkConfig>(Container.Identifiers.Crypto).toConstantValue(config);
		// }
	}

	private fromConfigRepository(): NetworkConfig {
		const configRepository: any = this.app.get(Container.Identifiers.ConfigRepository);

		return {
			// @ts-ignore
			genesisBlock: configRepository.get<IBlockJson>("crypto.genesisBlock")!,
			// @ts-ignore
			milestones: configRepository.get<Array<Record<string, any>>>("crypto.milestones")!,
			// @ts-ignore
			network: configRepository.get<Network>("crypto.network")!,
		};
	}
}
