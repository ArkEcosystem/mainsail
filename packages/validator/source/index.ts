import { Contracts, Identifiers } from "@mainsail/contracts";
import { Providers, Utils } from "@mainsail/kernel";

import { Validator } from "./validator";
import { ValidatorRepository } from "./validator-repository";

export class ServiceProvider extends Providers.ServiceProvider {
	public async register(): Promise<void> {
		const consensusKeyPairFactory = this.app.getTagged<Contracts.Crypto.KeyPairFactory>(
			Identifiers.Cryptography.Identity.KeyPair.Factory,
			"type",
			"consensus",
		);

		const validators: Contracts.Validator.Validator[] = [];
		const secrets = this.app.config("validators.secrets");
		Utils.assert.defined<string[]>(secrets);

		for (const secret of secrets.values()) {
			const consensusKeyPair = await consensusKeyPairFactory.fromMnemonic(secret);

			validators.push(this.app.resolve<Contracts.Validator.Validator>(Validator).configure(consensusKeyPair));
		}

		this.app
			.bind(Identifiers.Consensus.ValidatorRepository)
			.toConstantValue(this.app.resolve(ValidatorRepository).configure(validators));
	}
}
