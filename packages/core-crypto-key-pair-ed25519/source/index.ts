import { Contracts, Identifiers } from "@arkecosystem/core-contracts";
import { Providers } from "@arkecosystem/core-kernel";

import { KeyPairFactory } from "./pair";
import { PrivateKeyFactory } from "./private";
import { PublicKeyFactory } from "./public";
import { schemas } from "./schemas";
import { PublicKeySerializer } from "./serializer";

export class ServiceProvider extends Providers.ServiceProvider {
	public async register(): Promise<void> {
		this.app.bind(Identifiers.Cryptography.Size.PublicKey).toConstantValue(32);

		this.app.bind(Identifiers.Cryptography.Identity.KeyPairFactory).to(KeyPairFactory).inSingletonScope();
		this.app.bind(Identifiers.Cryptography.Identity.PrivateKeyFactory).to(PrivateKeyFactory).inSingletonScope();
		this.app.bind(Identifiers.Cryptography.Identity.PublicKeyFactory).to(PublicKeyFactory).inSingletonScope();
		this.app.bind(Identifiers.Cryptography.Identity.PublicKeySerializer).to(PublicKeySerializer).inSingletonScope();

		this.#registerSchemas();
	}

	#registerSchemas(): void {
		for (const schema of Object.values(schemas)) {
			this.app.get<Contracts.Crypto.IValidator>(Identifiers.Cryptography.Validator).addSchema(schema);
		}
	}
}
