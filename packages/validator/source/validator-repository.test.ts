import { Contracts } from "@mainsail/contracts";
import { describe, Sandbox } from "../../test-framework";
import { prepareSandbox } from "../test/helpers/prepare-sandbox";
import { ValidatorRepository } from "./validator-repository";
import { Validator } from "./validator";
import { validatorKeys } from "../../validator-set-static/test/fixtures/validatorKeys";

describe<{
	sandbox: Sandbox;
	validatorRepository: ValidatorRepository;
}>("ValidatorRepository", ({ it, assert, beforeEach }) => {
	beforeEach(async (context) => {
		await prepareSandbox(context);

		const validators: Contracts.Consensus.IValidator[] = [];
		for (const { consensusKeyPair, walletPublicKey } of validatorKeys) {
			validators.push(
				context.sandbox.app
					.resolve<Contracts.Consensus.IValidator>(Validator)
					.configure(walletPublicKey, consensusKeyPair),
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

	it("#getValidators - should known validators", async ({ validatorRepository }) => {
		assert.empty(validatorRepository.getValidators(["abc"]));
		assert.length(
			validatorRepository.getValidators(validatorKeys.map(({ consensusKeyPair: { publicKey } }) => publicKey)),
			validatorKeys.length,
		);
		assert.length(
			validatorRepository.getValidators([
				...validatorKeys.map(({ consensusKeyPair: { publicKey } }) => publicKey),
				"abc",
				"def",
			]),
			validatorKeys.length,
		);
	});
});
