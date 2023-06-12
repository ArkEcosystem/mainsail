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

export class ServiceProvider extends Providers.ServiceProvider {
	public async register(): Promise<void> {
		this.app
			.bind(Identifiers.Cryptography.Size.PublicKey)
			.toConstantValue(48)
			.when(Selectors.anyAncestorOrTargetTaggedFirst("type", "consensus"));

		this.app
			.bind(Identifiers.Cryptography.Size.Signature)
			.toConstantValue(96)
			.when(Selectors.anyAncestorOrTargetTaggedFirst("type", "consensus"));

		this.app
			.bind(Identifiers.Cryptography.Identity.KeyPairFactory)
			.to(KeyPairFactory)
			.inSingletonScope()
			.when(Selectors.anyAncestorOrTargetTaggedFirst("type", "consensus"));

		this.app
			.bind(Identifiers.Cryptography.Identity.PrivateKeyFactory)
			.to(PrivateKeyFactory)
			.inSingletonScope()
			.when(Selectors.anyAncestorOrTargetTaggedFirst("type", "consensus"));

		this.app
			.bind(Identifiers.Cryptography.Identity.PublicKeyFactory)
			.to(PublicKeyFactory)
			.inSingletonScope()
			.when(Selectors.anyAncestorOrTargetTaggedFirst("type", "consensus"));

		this.app
			.bind(Identifiers.Cryptography.Identity.PublicKeySerializer)
			.to(PublicKeySerializer)
			.inSingletonScope()
			.when(Selectors.anyAncestorOrTargetTaggedFirst("type", "consensus"));

		this.app
			.bind(Identifiers.Cryptography.Signature)
			.to(Signature)
			.inSingletonScope()
			.when(Selectors.anyAncestorOrTargetTaggedFirst("type", "consensus"));

		for (const schema of Object.values(schemas)) {
			this.app.get<Contracts.Crypto.IValidator>(Identifiers.Cryptography.Validator).addSchema(schema);
		}
	}
}
