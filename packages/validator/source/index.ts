import { Contracts, Identifiers } from "@mainsail/contracts";
import { Providers, Utils } from "@mainsail/kernel";

import { Validator } from "./validator";
import { ValidatorRepository } from "./validator-repository";

export class ServiceProvider extends Providers.ServiceProvider {
	public async register(): Promise<void> {
		const walletPublicKeyFactory = this.app.getTagged<Contracts.Crypto.IPublicKeyFactory>(
			Identifiers.Cryptography.Identity.PublicKeyFactory,
			"type",
			"wallet",
		);

		const consensusKeyPairFactory = this.app.getTagged<Contracts.Crypto.IKeyPairFactory>(
			Identifiers.Cryptography.Identity.KeyPairFactory,
			"type",
			"consensus",
		);

		const validators: Contracts.Consensus.IValidator[] = [];
		const secrets = this.app.config("validators.secrets");
		Utils.assert.defined<string[]>(secrets);

		for (let i = 0; i < secrets.length; i++) {
			const secret = secrets[i];
			const consensusKeyPair = await consensusKeyPairFactory.fromMnemonic(secret);
			const walletPublicKey = await walletPublicKeyFactory.fromMnemonic(secret);

			validators.push(
				this.app
					.resolve<Contracts.Consensus.IValidator>(Validator)
					.configure(walletPublicKey, consensusKeyPair, i),
			);
		}

		this.app
			.bind(Identifiers.Consensus.ValidatorRepository)
			.toConstantValue(this.app.resolve(ValidatorRepository).configure(validators));
	}
}
