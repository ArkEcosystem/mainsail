import { inject, interfaces, optional } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { Providers, Utils } from "@mainsail/kernel";

import { Identifiers as ValidatorIdentifiers } from "./identifiers.js";
import { Validator } from "./validator.js";
import { ValidatorRepository } from "./validator-repository.js";

export * from "./identifiers.js";
export * from "./validator.js";

export class ServiceProvider extends Providers.ServiceProvider {
	@optional()
	@inject(ValidatorIdentifiers.ValidatorConstructor)
	private readonly validatorConstructor: interfaces.Newable<Contracts.Validator.Validator> = Validator;

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

			validators.push(
				this.app.resolve<Contracts.Validator.Validator>(this.validatorConstructor).configure(consensusKeyPair),
			);
		}

		this.app
			.bind(Identifiers.Validator.Repository)
			.toConstantValue(this.app.resolve(ValidatorRepository).configure(validators));
	}
}
