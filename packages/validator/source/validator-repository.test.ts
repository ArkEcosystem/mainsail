import { Contracts } from "@mainsail/contracts";
import { describe, Sandbox } from "@mainsail/test-framework";

import { validatorKeys } from "../test/fixtures/validator-keys";
import { prepareSandbox } from "../test/helpers/prepare-sandbox";
import { Validator } from "./validator";
import { ValidatorRepository } from "./validator-repository";

describe<{
	sandbox: Sandbox;
	validatorRepository: ValidatorRepository;
}>("ValidatorRepository", ({ it, assert, beforeEach }) => {
	beforeEach(async (context) => {
		await prepareSandbox(context);

		const validators: Contracts.Validator.Validator[] = [];
		for (const { consensusKeyPair } of validatorKeys) {
			validators.push(
				context.sandbox.app.resolve<Contracts.Validator.Validator>(Validator).configure(consensusKeyPair),
			);
		}

		context.validatorRepository = context.sandbox.app.resolve(ValidatorRepository).configure(validators);
	});

	it("#getValidator - should return undefined", async ({ validatorRepository }) => {
		assert.undefined(validatorRepository.getValidator("abc"));
	});

	it("#getValidator - should return existing validator", async ({ validatorRepository }) => {
		assert.defined(validatorRepository.getValidator(validatorKeys[0].consensusKeyPair.publicKey));
	});
});
