import { Contracts, Identifiers } from "@mainsail/contracts";

import { validatorWalletFactory } from "../../state/source/wallets/factory";
import { describe, Sandbox } from "../../test-framework";
import { ValidatorSet } from "./validator-set";

describe<{
	sandbox: Sandbox;
	validatorSet: ValidatorSet;
	walletRepository: any;
	validatorWalletFactory: any;
	cryptoConfiguration: any;
}>("ValidatorSet", ({ it, assert, beforeEach, stub }) => {
	beforeEach(async (context) => {
		context.walletRepository = {
			allValidators: () => {},
		};

		context.cryptoConfiguration = {
			get: () => [
				{
					activeValidators: 2,
					height: 1,
				},
			],
			getHeight: () => 1,
			getMilestone: () => ({
				activeValidators: 2,
				height: 1,
			}),
		};

		context.sandbox = new Sandbox();

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

		await validatorSet.onCommit({
			getBlock: () => ({
				data: {
					height: 0,
				},
			}),
			store: {
				walletRepository,
			},
		} as Contracts.Processor.ProcessableUnit);
		const validators = validatorSet.getActiveValidators();
		assert.equal(validators.length, 2);

		spyAllValidators.calledTimes(1);
	});
});
