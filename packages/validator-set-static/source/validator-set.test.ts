import { Identifiers } from "@mainsail/contracts";

import { describe, Sandbox } from "../../test-framework";
import { ValidatorSet } from "./validator-set";

describe<{
	sandbox: Sandbox;
	validatorSet: ValidatorSet;
	walletRepository: any;
	cryptoConfiguration: any;
}>("ValidatorSet", ({ it, assert, beforeEach, stub }) => {
	beforeEach(async (context) => {
		context.walletRepository = {
			findByUsername: () => {},
		};

		context.cryptoConfiguration = {
			getMilestone: () => ({
				activeValidators: 2,
			}),
		};

		context.sandbox = new Sandbox();

		context.sandbox.app.bind(Identifiers.WalletRepository).toConstantValue(context.walletRepository);
		context.sandbox.app.bind(Identifiers.Cryptography.Configuration).toConstantValue(context.cryptoConfiguration);

		context.validatorSet = context.sandbox.app.resolve(ValidatorSet);
	});

	it("#getActiveValidators - should return active validators", async ({ validatorSet, walletRepository }) => {
		const findByUsernameSpy = stub(walletRepository, "findByUsername").returnValue({ getPublicKey: () => "publicKey" });

		const validators = await validatorSet.getActiveValidators();
		assert.equal(validators.length, 2);

		findByUsernameSpy.calledTimes(2);
		findByUsernameSpy.calledWith("genesis_1");
		findByUsernameSpy.calledWith("genesis_2");
	});
});
