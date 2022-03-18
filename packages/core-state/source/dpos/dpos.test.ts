import { Application, Services, Utils } from "@arkecosystem/core-kernel";
import { Contracts, Identifiers } from "@arkecosystem/core-contracts";
import { Container, injectable } from "@arkecosystem/core-container";
import { BigNumber } from "@arkecosystem/utils";
import { describe } from "../../../core-test-framework";
import { AddressFactory } from "../../../core-crypto-address-base58/source/address.factory";
import { KeyPairFactory } from "../../../core-crypto-key-pair-schnorr/source/pair";
import { PublicKeyFactory } from "../../../core-crypto-key-pair-schnorr/source/public";

import { buildValidatorAndVoteWallets } from "../../test/build-validator-and-vote-balances";
import { registerIndexers, WalletRepository } from "../wallets";
import { DposState } from "./dpos";
import { Configuration } from "../../../core-crypto-config";
import { walletFactory } from "../wallets/wallet-factory";
import { spy } from "sinon";
import { AssertionException } from "@arkecosystem/core-contracts/distribution/exceptions";

describe<{
	app: Application;
	dposState: DposState;
	walletRepo: WalletRepository;
	round: Contracts.Shared.RoundInfo;
	configuration: Contracts.Crypto.IConfiguration;
	logger: Contracts.Kernel.Logger;
}>("dpos", ({ it, beforeEach, assert }) => {
	beforeEach(async (context) => {
		context.logger = {
			debug: () => {},
			error: () => {},
			info: () => {},
			warning: () => {},
		} as any;

		context.app = new Application(new Container());
		context.app.bind(Identifiers.LogService).toConstantValue(context.logger);
		context.app.bind(Identifiers.Cryptography.Configuration).to(Configuration).inSingletonScope();

		context.configuration = context.app.get<Contracts.Crypto.IConfiguration>(
			Identifiers.Cryptography.Configuration,
		);
		context.configuration.setConfig({
			milestones: [
				{
					address: {
						base58: 23,
					},
				},
			],
		} as any);

		context.app.bind(Identifiers.Cryptography.Identity.AddressFactory).to(AddressFactory).inSingletonScope();
		context.app.bind(Identifiers.Cryptography.Identity.KeyPairFactory).to(KeyPairFactory).inSingletonScope();
		context.app.bind(Identifiers.Cryptography.Identity.PublicKeyFactory).to(PublicKeyFactory).inSingletonScope();

		context.app.bind(Identifiers.WalletAttributes).to(Services.Attributes.AttributeSet).inSingletonScope();
		const attributes = context.app.get<Services.Attributes.AttributeSet>(Identifiers.WalletAttributes);
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

		@injectable()
		class MockEventDispatcher {
			public dispatch(data) {
				return spy()(data);
			}

			public dispatchSync(...data) {
				return spy()(...data);
			}
		}

		context.app.bind(Identifiers.EventDispatcherService).to(MockEventDispatcher);
		context.app.bind(Identifiers.WalletRepository).to(WalletRepository).inSingletonScope();
		context.app
			.bind(Identifiers.WalletFactory)
			.toFactory(({ container }) =>
				walletFactory(
					container.get(Identifiers.WalletAttributes),
					container.get(Identifiers.EventDispatcherService),
				),
			);

		registerIndexers(context.app);

		context.app.bind(Identifiers.DposState).to(DposState).inSingletonScope();

		context.dposState = context.app.get<DposState>(Identifiers.DposState);
		context.walletRepo = context.app.get<WalletRepository>(Identifiers.WalletRepository);

		await buildValidatorAndVoteWallets(
			context.app.get(Identifiers.Cryptography.Identity.AddressFactory),
			5,
			context.walletRepo,
		);
	});

	it.skip("should update validator votes of htlc locked balances", async (context) => {
		await context.dposState.buildVoteBalances();

		const validators = context.walletRepo.allByUsername();

		for (let i = 0; i < 5; i++) {
			const validator = validators[4 - i];
			const total = BigNumber.make(5 - i)
				.times(1000)
				.times(BigNumber.SATOSHI);

			assert.equal(validator.getAttribute<BigNumber>("validator.voteBalance"), total);
		}
	});

	it("buildValidatorRanking - should build ranking and sort validators by vote balance", async (context) => {
		await context.dposState.buildVoteBalances();
		context.dposState.buildValidatorRanking();

		const validators = context.dposState.getActiveValidators();
		assert.is(validators.length, 5);

		for (let i = 0; i < 5; i++) {
			const validator = validators[i];
			const total = BigNumber.make((5 - i) * 1000).times(BigNumber.SATOSHI);

			assert.equal(validator.getAttribute<number>("validator.rank"), i + 1);
			assert.equal(validator.getAttribute<BigNumber>("validator.voteBalance"), total);
		}
	});

	it("buildValidatorRanking - should throw if two wallets have the same public key", async (context) => {
		const validators = await buildValidatorAndVoteWallets(
			context.app.get(Identifiers.Cryptography.Identity.AddressFactory),
			5,
			context.walletRepo,
		);
		validators[0].setAttribute("validator.resigned", true);

		validators[1].setAttribute("validator.voteBalance", Utils.BigNumber.make(5467));
		validators[2].setAttribute("validator.voteBalance", Utils.BigNumber.make(5467));
		validators[1].setPublicKey("03720586a26d8d49ec27059bd4572c49ba474029c3627715380f4df83fb431aece");
		validators[2].setPublicKey("03720586a26d8d49ec27059bd4572c49ba474029c3627715380f4df83fb431aece");
		context.walletRepo.index(validators[2]);

		assert.rejects(
			() => context.dposState.buildValidatorRanking(),
			'The balance and public key of both validators are identical! Validator "validator2" appears twice in the list.',
		);
	});

	it("buildValidatorRanking - should not throw if public keys are different and balances are the same", async (context) => {
		const validators = await buildValidatorAndVoteWallets(
			context.app.get(Identifiers.Cryptography.Identity.AddressFactory),
			5,
			context.walletRepo,
		);

		validators[1].setAttribute("validator.voteBalance", Utils.BigNumber.make(5467));
		validators[2].setAttribute("validator.voteBalance", Utils.BigNumber.make(5467));

		assert.not.throws(() => context.dposState.buildValidatorRanking());
		assert.equal(validators[1].getAttribute("validator.rank"), 1);
		assert.equal(validators[2].getAttribute("validator.rank"), 2);
		assert.equal(validators[0].getAttribute("validator.rank"), 3);
	});

	it("setValidatorsRound - should throw if there are not enough validators", (context) => {
		context.dposState.buildVoteBalances();
		context.dposState.buildValidatorRanking();
		const round = Utils.roundCalculator.calculateRound(1, context.configuration);
		round.maxValidators = 51;

		assert.rejects(
			() => context.dposState.setValidatorsRound(round),
			`Expected to find 51 validators but only found 5.This indicates an issue with the genesis block & validators`,
		);
	});

	it("setValidatorsRound - should set the validators of a round", async (context) => {
		const debugLogger = spy(context.logger, "debug");

		await context.dposState.buildVoteBalances();
		context.dposState.buildValidatorRanking();
		const round = Utils.roundCalculator.calculateRound(1, context.configuration);
		round.maxValidators = 4;
		context.dposState.setValidatorsRound(round);
		const validators = context.dposState.getActiveValidators();
		const roundValidators = context.dposState.getRoundValidators();

		assert.equal(context.dposState.getRoundInfo(), round);
		assert.equal(roundValidators, validators.slice(0, 4));

		for (let i = 0; i < round.maxValidators; i++) {
			const validator = await context.walletRepo.findByPublicKey(roundValidators[i].getPublicKey()!);

			assert.equal(validator.getAttribute("validator.round"), round.round);
		}

		// TODO: when we remove Assertion checks, this won't throw
		// instead it should not.toEqual(round)
		// assert.not.equal(validators[4].getAttribute("validator.round"), round)
		assert.rejects(() => validators[4].getAttribute("validator.round"), AssertionException);
		debugLogger.calledWith("Loaded 4 active validators");
	});

	it("should run all getters", async (context) => {
		await context.dposState.buildVoteBalances();
		context.dposState.buildValidatorRanking();
		context.round = Utils.roundCalculator.calculateRound(1, context.configuration);
		context.round.maxValidators = 5;
		context.dposState.setValidatorsRound(context.round);

		assert.equal(context.dposState.getRoundInfo(), context.round);
		assert.equal(context.dposState.getAllValidators(), context.walletRepo.allByUsername());
		assert.containValues(context.dposState.getActiveValidators(), context.walletRepo.allByUsername());
		assert.containValues(context.dposState.getRoundValidators(), context.walletRepo.allByUsername());
	});
});
