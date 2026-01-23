import type { Contracts } from "@mainsail/contracts";

import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";
import { validatorKeys } from "../test/fixtures/validator-keys";
import { prepareSandbox } from "../test/helpers/prepare-sandbox";
import { BIP39 } from "./keys/bip39";
import { Validator } from "./validator";
import { ValidatorRepository } from "./validator-repository";

describe<{
	app: Application;
	validatorRepository: ValidatorRepository;
}>("ValidatorRepository", ({ it, assert, beforeEach }) => {
	beforeEach(async (context) => {
		await prepareSandbox(context);

		const validators: Contracts.Validator.Validator[] = [];
		for (const { consensusKeyPair } of validatorKeys) {
			validators.push(
				context.app
					.resolve<Contracts.Validator.Validator>(Validator)
					.configure(await new BIP39().configure(consensusKeyPair)),
			);
		}

		context.validatorRepository = context.app.resolve(ValidatorRepository).configure(validators);
	});

	it("#getValidator - should return undefined", async ({ validatorRepository }) => {
		assert.undefined(validatorRepository.getValidator("abc"));
	});

	it("#getValidator - should return existing validator", async ({ validatorRepository }) => {
		assert.defined(validatorRepository.getValidator(validatorKeys[0].consensusKeyPair.publicKey));
	});
});
