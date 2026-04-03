import type { Contracts } from "@mainsail/contracts";

import { Identifiers } from "@mainsail/constants";
import { assert } from "@mainsail/utils";
import { Keys } from "@mainsail/validator";

import { Validator } from "./validator.js";

export const loadValidators = async (app: Contracts.Kernel.Application): Promise<void> => {
	const validators: Contracts.Validator.Validator[] = [];
	const validatorConfig = app.config<{ secrets: string[] }>("validators");
	assert.defined(validatorConfig);
	const { secrets } = validatorConfig;

	const consensusKeyPairFactory = app.getTagged<Contracts.Crypto.KeyPairFactory>(
		Identifiers.Cryptography.Identity.KeyPair.Factory,
		"type",
		"consensus",
	);

	for (const secret of secrets.values()) {
		const consensusKeyPair = await consensusKeyPairFactory.fromMnemonic(secret);

		validators.push(
			app
				.resolve<Contracts.Validator.Validator>(Validator)
				.configure(await new Keys.BIP39().configure(consensusKeyPair)),
		);
	}

	app.get<{ configure: (validators: Contracts.Validator.Validator[]) => void }>(
		Identifiers.Validator.Repository,
	).configure(validators);
};
