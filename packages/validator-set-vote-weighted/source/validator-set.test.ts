import { Contracts, Identifiers } from "@mainsail/contracts";
import { Services, Utils } from "@mainsail/kernel";

import { Wallets } from "../../state";
import { walletFactory } from "../../state/source/wallets/wallet-factory";
import { registerIndexers } from "../../state/source/wallets/indexers";
import { AddressFactory } from "../../crypto-address-base58/source/address.factory";
import { KeyPairFactory } from "../../crypto-key-pair-schnorr/source/pair";
import { PublicKeyFactory } from "../../crypto-key-pair-schnorr/source/public";
import { describe, Sandbox } from "../../test-framework";
import { buildValidatorAndVoteWallets } from "../test/build-validator-and-vote-balances";

import { ValidatorSet } from "./validator-set";
import { spy } from "sinon";
import { injectable, Selectors } from "@mainsail/container";

describe<{
	sandbox: Sandbox;
	validatorSet: ValidatorSet;
	walletRepository: any;
	cryptoConfiguration: any;
}>("ValidatorSet", ({ it, assert, beforeEach }) => {
	beforeEach(async (context) => {
		context.cryptoConfiguration = {
			getMilestone: () => ({
				activeValidators: 5,
				address: {
					base58: 23,
				},
			}),
		};

		context.sandbox = new Sandbox();

		context.sandbox.app.bind(Identifiers.WalletAttributes).to(Services.Attributes.AttributeSet).inSingletonScope();
		const attributes = context.sandbox.app.get<Services.Attributes.AttributeSet>(Identifiers.WalletAttributes);
		attributes.set("validator");
		attributes.set("validator.username");
		attributes.set("validator.voteBalance");
		attributes.set("validator.producedBlocks");
		attributes.set("validator.forgedTotal");
		attributes.set("validator.approval");
		attributes.set("vote");
		attributes.set("validator.resigned");
		attributes.set("validator.rank");
		attributes.set("validator.round");

		// @ts-ignore
		@injectable()
		class MockEventDispatcher {
			public dispatch(data) {
				return spy()(data);
			}

			public dispatchSync(...data) {
				return spy()(...data);
			}
		}

		context.sandbox.app.bind(Identifiers.EventDispatcherService).to(MockEventDispatcher);

		context.sandbox.app.bind(Identifiers.Cryptography.Configuration).toConstantValue(context.cryptoConfiguration);
		context.sandbox.app
			.bind(Identifiers.Cryptography.Identity.AddressFactory)
			.to(AddressFactory)
			.inSingletonScope();
		context.sandbox.app
			.bind(Identifiers.Cryptography.Identity.KeyPairFactory)
			.to(KeyPairFactory)
			.inSingletonScope();
		context.sandbox.app
			.bind(Identifiers.Cryptography.Identity.PublicKeyFactory)
			.to(PublicKeyFactory)
			.inSingletonScope();

		registerIndexers(context.sandbox.app);

		context.sandbox.app
			.bind(Identifiers.WalletRepository)
			.to(Wallets.WalletRepository)
			.inSingletonScope()
			.when(Selectors.anyAncestorOrTargetTaggedFirst("state", "blockchain"));

		context.sandbox.app
			.bind(Identifiers.WalletFactory)
			.toFactory(({ container }) =>
				walletFactory(
					container.get(Identifiers.WalletAttributes),
					container.get(Identifiers.EventDispatcherService),
				),
			)
			.when(Selectors.anyAncestorOrTargetTaggedFirst("state", "blockchain"));

		context.walletRepository = context.sandbox.app.getTagged(Identifiers.WalletRepository, "state", "blockchain");
		context.validatorSet = context.sandbox.app.resolve(ValidatorSet);

		await buildValidatorAndVoteWallets(5, context.walletRepository);
	});

	it("buildValidatorRanking - should build ranking and sort validators by vote balance", async ({ validatorSet }) => {
		await validatorSet.initialize();

		const validators = validatorSet.getActiveValidators();
		assert.is(validators.length, 5);

		for (let index = 0; index < 5; index++) {
			const validator = validators[index];
			const total = Utils.BigNumber.make((5 - index) * 1000).times(Utils.BigNumber.SATOSHI);

			assert.equal(validator.getRank(), index + 1);
			assert.equal(validator.getVoteBalance(), total);
		}
	});

	it("handleCommitBlock - should update ranking every full round", async ({ cryptoConfiguration, validatorSet }) => {
		const buildValidatorRankingSpy = spy(validatorSet, "buildValidatorRanking");

		const { activeValidators } = cryptoConfiguration.getMilestone();

		await validatorSet.handleCommitBlock({ commit: { height: 1 } } as Contracts.Crypto.ICommittedBlock);

		assert.true(buildValidatorRankingSpy.notCalled);

		let currentHeight = 0;
		for (let i = 0; i < activeValidators; i++) {
			await validatorSet.handleCommitBlock({
				commit: { height: currentHeight },
			} as Contracts.Crypto.ICommittedBlock);

			// Genesis block (= height 0) builds the ranking too
			assert.equal(buildValidatorRankingSpy.callCount, 1);

			currentHeight++;
		}

		// The ranking got updated twice, once for the genesis block and again after `activeDelegators` blocks
		assert.equal(currentHeight, 5);
		await validatorSet.handleCommitBlock({ commit: { height: currentHeight } } as Contracts.Crypto.ICommittedBlock);
		assert.equal(buildValidatorRankingSpy.callCount, 2);
		currentHeight++;

		buildValidatorRankingSpy.resetHistory();

		// Simulate another round
		for (let i = 0; i < activeValidators - 1; i++) {
			await validatorSet.handleCommitBlock({
				commit: { height: currentHeight },
			} as Contracts.Crypto.ICommittedBlock);
			assert.true(buildValidatorRankingSpy.notCalled);
			currentHeight++;
		}

		// Called again after another round
		assert.equal(currentHeight, 10);
		await validatorSet.handleCommitBlock({ commit: { height: currentHeight } } as Contracts.Crypto.ICommittedBlock);
		assert.true(buildValidatorRankingSpy.calledOnce);
	});
});
