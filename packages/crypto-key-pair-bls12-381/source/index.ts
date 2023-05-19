import { Contracts, Identifiers } from "@mainsail/contracts";
import { Providers } from "@mainsail/kernel";

import { KeyPairFactory } from "./pair";
import { PrivateKeyFactory } from "./private";
import { PublicKeyFactory } from "./public";
import { schemas } from "./schemas";
import { PublicKeySerializer } from "./serializer";

export class ServiceProvider extends Providers.ServiceProvider {
	public async register(): Promise<void> {
		const config = this.app.get<Contracts.Crypto.IConfiguration>(Identifiers.Cryptography.Configuration);

		// TODO: consider different approach
		const consensusKeyPair = config.getMilestone().consensusKeyPair;
		if (consensusKeyPair === "bls12-381") {
			this.app.bind(Identifiers.Consensus.Size.PublicKey).toConstantValue(48);

			this.app.bind(Identifiers.Consensus.Identity.KeyPairFactory).to(KeyPairFactory).inSingletonScope();
			this.app.bind(Identifiers.Consensus.Identity.PrivateKeyFactory).to(PrivateKeyFactory).inSingletonScope();
			this.app.bind(Identifiers.Consensus.Identity.PublicKeyFactory).to(PublicKeyFactory).inSingletonScope();
			this.app
				.bind(Identifiers.Consensus.Identity.PublicKeySerializer)
				.to(PublicKeySerializer)
				.inSingletonScope();
		} else {
			this.app.bind(Identifiers.Cryptography.Size.PublicKey).toConstantValue(48);

			this.app.bind(Identifiers.Cryptography.Identity.KeyPairFactory).to(KeyPairFactory).inSingletonScope();
			this.app.bind(Identifiers.Cryptography.Identity.PrivateKeyFactory).to(PrivateKeyFactory).inSingletonScope();
			this.app.bind(Identifiers.Cryptography.Identity.PublicKeyFactory).to(PublicKeyFactory).inSingletonScope();
			this.app
				.bind(Identifiers.Cryptography.Identity.PublicKeySerializer)
				.to(PublicKeySerializer)
				.inSingletonScope();

			this.#registerSchemas();
		}
	}

	#registerSchemas(): void {
		for (const schema of Object.values(schemas)) {
			this.app.get<Contracts.Crypto.IValidator>(Identifiers.Cryptography.Validator).addSchema(schema);
		}
	}
}
