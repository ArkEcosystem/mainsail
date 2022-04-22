import { Contracts, Identifiers } from "@arkecosystem/core-contracts";
import { Providers } from "@arkecosystem/core-kernel";

import { Configuration } from "./configuration";

export class ServiceProvider extends Providers.ServiceProvider {
	public async register(): Promise<void> {
		this.app.bind(Identifiers.Cryptography.Configuration).to(Configuration).inSingletonScope();

		try {
			const config: Contracts.Crypto.NetworkConfigPartial = this.#fromConfigRepository();

			this.app.get<Contracts.Crypto.IConfiguration>(Identifiers.Cryptography.Configuration).setConfig(config);

			this.app.bind<Contracts.Crypto.NetworkConfigPartial>(Identifiers.Crypto).toConstantValue(config);
		} catch {
			// @TODO: this breaks during network config generation
		}
	}

	#fromConfigRepository(): Contracts.Crypto.NetworkConfigPartial {
		const configRepository = this.app.get<Contracts.Kernel.Repository>(Identifiers.ConfigRepository);

		return {
			genesisBlock: configRepository.get<Contracts.Crypto.IBlockJson>("crypto.genesisBlock")!,
			milestones: configRepository.get<Contracts.Crypto.MilestonePartial[]>("crypto.milestones")!,
			network: configRepository.get<Contracts.Crypto.Network>("crypto.network")!,
		};
	}
}
