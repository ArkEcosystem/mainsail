import { Contracts, Identifiers } from "@mainsail/contracts";
import { Selectors } from "@mainsail/container";
import { Providers } from "@mainsail/kernel";

import { KeyPairFactory } from "./pair";
import { PrivateKeyFactory } from "./private";
import { PublicKeyFactory } from "./public";
import { schemas } from "./schemas";
import { PublicKeySerializer } from "./serializer";

export class ServiceProvider extends Providers.ServiceProvider {
	public async register(): Promise<void> {
		this.app.bind(Identifiers.Cryptography.Size.PublicKey).toConstantValue(32)
			.when(Selectors.anyAncestorOrTargetTaggedFirst("type", "wallet"));

		this.app.bind(Identifiers.Cryptography.Identity.KeyPairFactory).to(KeyPairFactory).inSingletonScope()
			.when(Selectors.anyAncestorOrTargetTaggedFirst("type", "wallet"));
		this.app.bind(Identifiers.Cryptography.Identity.PrivateKeyFactory).to(PrivateKeyFactory).inSingletonScope()
			.when(Selectors.anyAncestorOrTargetTaggedFirst("type", "wallet"));
		this.app.bind(Identifiers.Cryptography.Identity.PublicKeyFactory).to(PublicKeyFactory).inSingletonScope()
			.when(Selectors.anyAncestorOrTargetTaggedFirst("type", "wallet"));
		this.app.bind(Identifiers.Cryptography.Identity.PublicKeySerializer).to(PublicKeySerializer).inSingletonScope()
			.when(Selectors.anyAncestorOrTargetTaggedFirst("type", "wallet"));

		this.#registerSchemas();
	}

	#registerSchemas(): void {
		for (const schema of Object.values(schemas)) {
			this.app.get<Contracts.Crypto.IValidator>(Identifiers.Cryptography.Validator).addSchema(schema);
		}
	}
}
