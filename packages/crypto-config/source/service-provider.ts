import { Identifiers } from "@mainsail/constants";
import { injectable } from "@mainsail/container";
import type { Contracts } from "@mainsail/contracts";
import { Providers } from "@mainsail/kernel";

import { Configuration } from "./configuration.js";
import { schemas } from "./schemas.js";

@injectable()
export class ServiceProvider extends Providers.ServiceProvider {
	public async register(): Promise<void> {
		this.#registerSchemas();

		this.app.bind(Identifiers.Cryptography.Configuration).to(Configuration).inSingletonScope();

		this.app
			.get<Contracts.Crypto.Configuration>(Identifiers.Cryptography.Configuration)
			.setConfig(this.#fromConfigRepository());

	}

	#fromConfigRepository(): Contracts.Crypto.NetworkConfigPartial {
		const configRepository = this.app.get<Contracts.Kernel.Repository>(Identifiers.Config.Repository);

		return {
			genesisBlock: configRepository.get<Contracts.Crypto.CommitJson>("crypto.genesisBlock"),
			milestones: configRepository.get<Contracts.Crypto.MilestonePartial[]>("crypto.milestones"),
			network: configRepository.get<Contracts.Crypto.Network>("crypto.network"),
		};
	}

	#registerSchemas(): void {
		for (const schema of Object.values(schemas)) {
			this.app.get<Contracts.Crypto.Validator>(Identifiers.Cryptography.Validator).addSchema(schema);
		}
	}
}
