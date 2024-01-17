import { Selectors } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import {
	KeyPairFactory,
	PrivateKeyFactory,
	PublicKeyFactory,
	PublicKeySerializer,
} from "@mainsail/crypto-key-pair-bls12-381";
import { Signature } from "@mainsail/crypto-signature-bls12-381";
import { Providers } from "@mainsail/kernel";

import { schemas } from "./schemas";
export * from "./schemas";

export class ServiceProvider extends Providers.ServiceProvider {
	public async register(): Promise<void> {
		this.app
			.bind(Identifiers.Cryptography.Identity.PublicKey.Size)
			.toConstantValue(48)
			.when(Selectors.anyAncestorOrTargetTaggedFirst("type", "consensus"));

		this.app
			.bind(Identifiers.Cryptography.Signature.Size)
			.toConstantValue(96)
			.when(Selectors.anyAncestorOrTargetTaggedFirst("type", "consensus"));

		this.app
			.bind(Identifiers.Cryptography.Identity.KeyPair.Factory)
			.to(KeyPairFactory)
			.inSingletonScope()
			.when(Selectors.anyAncestorOrTargetTaggedFirst("type", "consensus"));

		this.app
			.bind(Identifiers.Cryptography.Identity.PrivateKey.Factory)
			.to(PrivateKeyFactory)
			.inSingletonScope()
			.when(Selectors.anyAncestorOrTargetTaggedFirst("type", "consensus"));

		this.app
			.bind(Identifiers.Cryptography.Identity.PublicKey.Factory)
			.to(PublicKeyFactory)
			.inSingletonScope()
			.when(Selectors.anyAncestorOrTargetTaggedFirst("type", "consensus"));

		this.app
			.bind(Identifiers.Cryptography.Identity.PublicKey.Serializer)
			.to(PublicKeySerializer)
			.inSingletonScope()
			.when(Selectors.anyAncestorOrTargetTaggedFirst("type", "consensus"));

		this.app
			.bind(Identifiers.Cryptography.Signature.Instance)
			.to(Signature)
			.inSingletonScope()
			.when(Selectors.anyAncestorOrTargetTaggedFirst("type", "consensus"));

		for (const schema of Object.values(schemas)) {
			this.app.get<Contracts.Crypto.Validator>(Identifiers.Cryptography.Validator).addSchema(schema);
		}
	}

	public requiredByWorker(): boolean { return true }
}
