import { injectable, Selectors } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { Providers } from "@mainsail/kernel";

import { KeyPairFactory } from "./pair.js";
import { PrivateKeyFactory } from "./private.js";
import { PublicKeyFactory } from "./public.js";
import { schemas } from "./schemas.js";
import { PublicKeySerializer } from "./serializer.js";

export * from "./pair.js";
export * from "./schemas.js";

@injectable()
export class ServiceProvider extends Providers.ServiceProvider {
	public async register(): Promise<void> {
		this.app
			.bind(Identifiers.Cryptography.Identity.PublicKey.Size)
			.toConstantValue(33)
			.when(Selectors.anyAncestorOrTargetTagged("type", "wallet"));

		this.app
			.bind(Identifiers.Cryptography.Identity.KeyPair.Factory)
			.to(KeyPairFactory)
			.inSingletonScope()
			.when(Selectors.anyAncestorOrTargetTagged("type", "wallet"));

		this.app
			.bind(Identifiers.Cryptography.Identity.PrivateKey.Factory)
			.to(PrivateKeyFactory)
			.inSingletonScope()
			.when(Selectors.anyAncestorOrTargetTagged("type", "wallet"));

		this.app
			.bind(Identifiers.Cryptography.Identity.PublicKey.Factory)
			.to(PublicKeyFactory)
			.inSingletonScope()
			.when(Selectors.anyAncestorOrTargetTagged("type", "wallet"));

		this.app
			.bind(Identifiers.Cryptography.Identity.PublicKey.Serializer)
			.to(PublicKeySerializer)
			.inSingletonScope()
			.when(Selectors.anyAncestorOrTargetTagged("type", "wallet"));

		this.#registerSchemas();
	}

	#registerSchemas(): void {
		for (const schema of Object.values(schemas)) {
			this.app.get<Contracts.Crypto.Validator>(Identifiers.Cryptography.Validator).addSchema(schema);
		}
	}
}
