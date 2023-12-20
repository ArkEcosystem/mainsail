import { injectable, Selectors } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { Utils } from "@mainsail/kernel";
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
	stateStore: any;
	stateService: any;
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

		context.stateStore = {
			getLastBlock: () => ({ header: { height: BigNumber.ZERO } }),
		};

		context.sandbox = new Sandbox();

		context.sandbox.app.bind(Identifiers.WalletAttributes).toConstantValue(getAttributeRepository());

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

		context.sandbox.app.bind(Identifiers.WalletRepositoryIndexSet).toConstantValue(getIndexSet());

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
		context.sandbox.app
			.bind(Identifiers.WalletFactory)
			.toFactory(() => walletFactory(context.sandbox.app.get(Identifiers.WalletAttributes)));
		context.sandbox.app.bind(Identifiers.ValidatorWalletFactory).toFactory(() => validatorWalletFactory);

		context.walletRepository = context.sandbox.app.resolve(Wallets.WalletRepository);

		context.sandbox.app.bind(Identifiers.StateService).toConstantValue({
			getStateStore: () => context.stateStore,
			getWalletRepository: () => context.walletRepository,
		});

		context.sandbox.app
			.bind(Identifiers.WalletFactory)
			.toFactory(({ container }) => walletFactory(container.get(Identifiers.WalletAttributes)))
			.when(Selectors.anyAncestorOrTargetTaggedFirst("state", "blockchain"));

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

			// 0.5% .. 0.1%
			assert.equal(validator.getApproval(), (5 - index) / 10);

			assert.equal(validator.getVoteBalance(), total);
		}
	});

	it("onCommit - should update ranking every full round", async ({ cryptoConfiguration, validatorSet }) => {
		const buildValidatorRankingSpy = spy(validatorSet, "buildValidatorRanking");

		const { activeValidators } = cryptoConfiguration.getMilestone();

		await validatorSet.onCommit({
			getCommit: async () => ({ block: { header: { height: 0 } } }),
		} as Contracts.Processor.IProcessableUnit);
		assert.true(buildValidatorRankingSpy.calledOnce);

		let currentHeight = 0;
		for (let index = 0; index < activeValidators; index++) {
			await validatorSet.onCommit({
				getCommit: async () => ({ block: { header: { height: currentHeight } } }),
			} as Contracts.Processor.IProcessableUnit);

			// Genesis block (= height 0) and the first block thereafter rebuild the ranking
			assert.equal(buildValidatorRankingSpy.callCount, 2);

			currentHeight++;
		}

		// The ranking now got updated thrice
		assert.equal(currentHeight, 5);
		await validatorSet.onCommit({
			getCommit: async () => ({ block: { header: { height: currentHeight } } }),
		} as Contracts.Processor.IProcessableUnit);
		assert.equal(buildValidatorRankingSpy.callCount, 3);
		currentHeight++;

		buildValidatorRankingSpy.resetHistory();

		// Simulate another round
		for (let index = 0; index < activeValidators - 1; index++) {
			await validatorSet.onCommit({
				getCommit: async () => ({ block: { header: { height: currentHeight } } }),
			} as Contracts.Processor.IProcessableUnit);
			assert.true(buildValidatorRankingSpy.notCalled);
			currentHeight++;
		}

		// Called again after another round
		assert.equal(currentHeight, 10);
		await validatorSet.onCommit({
			getCommit: async () => ({ block: { header: { height: currentHeight } } }),
		} as Contracts.Processor.IProcessableUnit);
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
