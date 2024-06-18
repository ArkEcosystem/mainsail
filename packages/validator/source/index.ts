import { Keystore } from "@chainsafe/bls-keystore";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { Providers, Utils } from "@mainsail/kernel";
import Joi from "joi";

import { BIP38, BIP39 } from "./keys/index.js";
import { Validator } from "./validator.js";
import { ValidatorRepository } from "./validator-repository.js";

export class ServiceProvider extends Providers.ServiceProvider {
	public async register(): Promise<void> {
		this.app.bind(Identifiers.Validator.Repository).toConstantValue(this.app.resolve(ValidatorRepository));
	}

	public async boot(): Promise<void> {
		const consensusKeyPairFactory = this.app.getTagged<Contracts.Crypto.KeyPairFactory>(
			Identifiers.Cryptography.Identity.KeyPair.Factory,
			"type",
			"consensus",
		);

		const validators: Contracts.Validator.Validator[] = [];
		const validatorConfig = this.app.config<{ secrets: string[]; keystore?: string }>("validators");
		Utils.assert.defined(validatorConfig);
		const { secrets, keystore } = validatorConfig;

		for (const secret of secrets.values()) {
			const consensusKeyPair = await consensusKeyPairFactory.fromMnemonic(secret);

			validators.push(
				this.app
					.resolve<Contracts.Validator.Validator>(Validator)
					.configure(await new BIP39().configure(consensusKeyPair)),
			);
		}

		// Load validator from keystore (if any)
		if (keystore) {
			const parsed = Keystore.parse(keystore);

			const configuration = this.app.getTagged<Providers.PluginConfiguration>(
				Identifiers.ServiceProvider.Configuration,
				"plugin",
				"validator",
			);

			validators.push(
				this.app
					.resolve<Contracts.Validator.Validator>(Validator)
					.configure(await new BIP38().configure(parsed, configuration.get("validatorKeystorePassword")!)),
			);

			// Wipe original password as it gets rotated in-memory
			configuration.unset("validatorKeystorePassword");
		}

		this.app.get<ValidatorRepository>(Identifiers.Validator.Repository).configure(validators);
	}

	public configSchema(): Joi.AnySchema {
		return Joi.object({
			txCollatorFactor: Joi.number().min(0).max(1).required(),
		}).unknown(true);
	}
}
