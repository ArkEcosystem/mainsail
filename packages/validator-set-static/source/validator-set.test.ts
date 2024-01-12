import { Identifiers } from "@mainsail/contracts";

import { validatorWalletFactory } from "../../state/source/wallets/factory";
import { describe, Sandbox } from "../../test-framework";
import { ValidatorSet } from "./validator-set";

describe<{
	sandbox: Sandbox;
	validatorSet: ValidatorSet;
	walletRepository: any;
	stateService: any;
	validatorWalletFactory: any;
	cryptoConfiguration: any;
}>("ValidatorSet", ({ it, assert, beforeEach, stub }) => {
	beforeEach(async (context) => {
		context.walletRepository = {
			allValidators: () => {},
		};

		context.stateService = {
			getWalletRepository: () => context.walletRepository,
		};

		context.cryptoConfiguration = {
			getHeight: () => 1,
			getMilestone: () => ({
				activeValidators: 2,
			}),
		};

		context.sandbox = new Sandbox();

		context.sandbox.app.bind(Identifiers.State.Service).toConstantValue(context.stateService);
		context.sandbox.app.bind(Identifiers.State.ValidatorWallet.Factory).toFactory(() => validatorWalletFactory);
		context.sandbox.app.bind(Identifiers.Cryptography.Configuration).toConstantValue(context.cryptoConfiguration);

		context.validatorSet = context.sandbox.app.resolve(ValidatorSet);
	});

	it("#getActiveValidators - should return active validators", async ({ validatorSet, walletRepository }) => {
		const wallet = {
			getPublicKey: () => "publicKey",
			setAttribute: () => {},
		};

		const spyAllValidators = stub(walletRepository, "allValidators").returnValue([wallet, wallet]);

		await validatorSet.initialize();
		const validators = validatorSet.getActiveValidators();
		assert.equal(validators.length, 2);

		spyAllValidators.calledTimes(1);
	});
});
