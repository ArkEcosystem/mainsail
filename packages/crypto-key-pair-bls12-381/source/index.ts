import { Selectors } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { Providers } from "@mainsail/kernel";

import { KeyPairFactory } from "./pair";
import { PrivateKeyFactory } from "./private";
import { PublicKeyFactory } from "./public";
import { schemas } from "./schemas";
import { PublicKeySerializer } from "./serializer";

export * from "./pair";
export * from "./private";
export * from "./public";
export * from "./schemas";
export * from "./serializer";

export class ServiceProvider extends Providers.ServiceProvider {
	public async register(): Promise<void> {
		this.app
			.bind(Identifiers.Cryptography.Identity.PublicKey.Size)
			.toConstantValue(48)
			.when(Selectors.anyAncestorOrTargetTaggedFirst("type", "wallet"));

		this.app
			.bind(Identifiers.Cryptography.Identity.KeyPair.Factory)
			.to(KeyPairFactory)
			.inSingletonScope()
			.when(Selectors.anyAncestorOrTargetTaggedFirst("type", "wallet"));
		this.app
			.bind(Identifiers.Cryptography.Identity.PrivateKey.Factory)
			.to(PrivateKeyFactory)
			.inSingletonScope()
			.when(Selectors.anyAncestorOrTargetTaggedFirst("type", "wallet"));
		this.app
			.bind(Identifiers.Cryptography.Identity.PublicKey.Factory)
			.to(PublicKeyFactory)
			.inSingletonScope()
			.when(Selectors.anyAncestorOrTargetTaggedFirst("type", "wallet"));
		this.app
			.bind(Identifiers.Cryptography.Identity.PublicKey.Serializer)
			.to(PublicKeySerializer)
			.inSingletonScope()
			.when(Selectors.anyAncestorOrTargetTaggedFirst("type", "wallet"));

		this.#registerSchemas();
	}

	#registerSchemas(): void {
		for (const schema of Object.values(schemas)) {
			this.app.get<Contracts.Crypto.Validator>(Identifiers.Cryptography.Validator).addSchema(schema);
		}
	}
}
