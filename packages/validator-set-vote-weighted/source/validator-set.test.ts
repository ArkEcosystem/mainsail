import { injectable, Selectors } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { BigNumber } from "@mainsail/utils";
import { spy } from "sinon";

import { AddressFactory } from "../../crypto-address-base58/source/address.factory";
import { KeyPairFactory } from "../../crypto-key-pair-schnorr/source/pair";
import { PublicKeyFactory } from "../../crypto-key-pair-schnorr/source/public";
import { Wallets } from "../../state";
import { validatorWalletFactory, walletFactory } from "../../state/source/wallets/factory";
import { describe, getAttributeRepository, getIndexSet, Sandbox } from "../../test-framework";
import { buildValidatorAndVoteWallets } from "../test/build-validator-and-vote-balances";
import { ValidatorSet } from "./validator-set";

describe<{
	sandbox: Sandbox;
	validatorSet: ValidatorSet;
	walletRepository: any;
	store: any;
	cryptoConfiguration: any;
}>("ValidatorSet", ({ it, assert, beforeEach }) => {
	beforeEach(async (context) => {
		const milestone = {
			activeValidators: 5,
			address: {
				base58: 23,
			},
			height: 0,
		};

		context.cryptoConfiguration = {
			get: (key) => {
				if (key === "genesisBlock.block.totalAmount") {
					return BigNumber.make(1_000_000).times(BigNumber.SATOSHI);
				}

				return [milestone];
			},
			getMilestone: () => milestone,
		};

		context.store = {
			getLastBlock: () => ({ header: { height: BigNumber.ZERO } }),
		};

		context.sandbox = new Sandbox();

		context.sandbox.app.bind(Identifiers.State.Wallet.Attributes).toConstantValue(getAttributeRepository());

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

		context.sandbox.app.bind(Identifiers.Services.EventDispatcher.Service).to(MockEventDispatcher);

		context.sandbox.app.bind(Identifiers.State.WalletRepository.IndexSet).toConstantValue(getIndexSet());

		context.sandbox.app.bind(Identifiers.Cryptography.Configuration).toConstantValue(context.cryptoConfiguration);
		context.sandbox.app
			.bind(Identifiers.Cryptography.Identity.Address.Factory)
			.to(AddressFactory)
			.inSingletonScope();
		context.sandbox.app
			.bind(Identifiers.Cryptography.Identity.KeyPair.Factory)
			.to(KeyPairFactory)
			.inSingletonScope();
		context.sandbox.app
			.bind(Identifiers.Cryptography.Identity.PublicKey.Factory)
			.to(PublicKeyFactory)
			.inSingletonScope();
		context.sandbox.app
			.bind(Identifiers.State.Wallet.Factory)
			.toFactory(() => walletFactory(context.sandbox.app.get(Identifiers.State.Wallet.Attributes)));
		context.sandbox.app.bind(Identifiers.State.ValidatorWallet.Factory).toFactory(() => validatorWalletFactory);

		context.walletRepository = context.sandbox.app.resolve(Wallets.WalletRepository);
		context.store.walletRepository = context.walletRepository;

		context.sandbox.app.bind(Identifiers.State.Service).toConstantValue({
			getStore: () => context.store,
		});

		context.sandbox.app
			.bind(Identifiers.State.Wallet.Factory)
			.toFactory(({ container }) => walletFactory(container.get(Identifiers.State.Wallet.Attributes)))
			.when(Selectors.anyAncestorOrTargetTaggedFirst("state", "blockchain"));

		context.validatorSet = context.sandbox.app.resolve(ValidatorSet);

		await buildValidatorAndVoteWallets(5, context.walletRepository);
	});

	it("buildValidatorRanking - should build ranking and sort validators by vote balance", async ({
		validatorSet,
		store,
	}) => {
		await validatorSet.onCommit({
			height: 0,
			store,
		} as Contracts.Processor.ProcessableUnit);

		const validators = validatorSet.getActiveValidators();
		assert.is(validators.length, 5);
		for (let index = 0; index < 5; index++) {
			const validator = validators[index];
			assert.equal(validator.getRank(), index + 1);

			assert.equal(validator.getApproval(), 0);
			assert.equal(validator.getVoteBalance(), BigNumber.ZERO);
		}
	});

	it("onCommit - should update ranking every full round", async ({ cryptoConfiguration, validatorSet, store }) => {
		const buildValidatorRankingSpy = spy(validatorSet, "buildValidatorRanking");

		const { activeValidators } = cryptoConfiguration.getMilestone();

		await validatorSet.onCommit({
			height: 0,
			store,
		} as Contracts.Processor.ProcessableUnit);
		assert.true(buildValidatorRankingSpy.calledOnce);

		let currentHeight = 0;
		for (let index = 0; index < activeValidators; index++) {
			await validatorSet.onCommit({
				height: currentHeight,
				store,
			} as Contracts.Processor.ProcessableUnit);

			// Genesis block (= height 0) and the first block thereafter rebuild the ranking
			assert.equal(buildValidatorRankingSpy.callCount, 2);

			currentHeight++;
		}

		// The ranking now got updated thrice
		assert.equal(currentHeight, 5);
		await validatorSet.onCommit({
			height: currentHeight,
			store,
		} as Contracts.Processor.ProcessableUnit);
		assert.equal(buildValidatorRankingSpy.callCount, 3);
		currentHeight++;

		buildValidatorRankingSpy.resetHistory();

		// Simulate another round
		for (let index = 0; index < activeValidators - 1; index++) {
			await validatorSet.onCommit({
				height: currentHeight,
				store,
			} as Contracts.Processor.ProcessableUnit);
			assert.true(buildValidatorRankingSpy.notCalled);
			currentHeight++;
		}

		// Called again after another round
		assert.equal(currentHeight, 10);
		await validatorSet.onCommit({
			height: currentHeight,
			store,
		} as Contracts.Processor.ProcessableUnit);
		assert.true(buildValidatorRankingSpy.calledOnce);
	});

	it("getActiveValidators - should throw error if insufficient active validators", async ({
		cryptoConfiguration,
		validatorSet,
	}) => {
		const { activeValidators } = cryptoConfiguration.getMilestone();
		assert.throws(
			() => validatorSet.getActiveValidators(),
			`Expected ${activeValidators} active validators, but got 0`,
		);
	});
});
