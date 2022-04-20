import { Contracts, Identifiers } from "@arkecosystem/core-contracts";
import { Application, Utils } from "@arkecosystem/core-kernel";

import { Configuration } from "../../../core-crypto-config";
import { VoteBuilder } from "../../../core-crypto-transaction-vote";
import { describeSkip, Factories } from "../../../core-test-framework";
import { buildValidatorAndVoteWallets } from "../../test/build-validator-and-vote-balances";
import { makeChainedBlocks } from "../../test/make-chained-block";
import { makeVoteTransactions } from "../../test/make-vote-transactions";
import { setUp } from "../../test/setup";
import { addTransactionsToBlock } from "../../test/transactions";
import { BlockState } from "../block-state";
import { StateStore } from "../stores";
import { WalletRepository } from "../wallets";
import { DposState } from "./dpos";

describeSkip<{
	app: Application;
	dposState: DposState;
	dposPreviousRoundStateProv: Contracts.State.DposPreviousRoundStateProvider;
	walletRepo: WalletRepository;
	factory: Factories.FactoryBuilder;
	blockState: BlockState;
	stateStore: StateStore;
	round: Contracts.Shared.RoundInfo;
	blocks: Contracts.Crypto.IBlock[];
	configuration: Configuration;
}>("dposPreviousRound", ({ it, beforeAll, beforeEach, afterEach, assert, spy, stub }) => {
	beforeAll(async (context) => {
		const environment = await setUp();

		context.app = environment.sandbox.app;
		context.dposState = environment.dPosState;
		context.dposPreviousRoundStateProv = environment.dposPreviousRound;
		context.walletRepo = environment.walletRepo;
		context.factory = environment.factory;
		context.blockState = environment.blockState;
		context.stateStore = environment.stateStore;
	});

	beforeEach(async (context) => {
		context.walletRepo.reset();

		context.round = Utils.roundCalculator.calculateRound(1, context.configuration);

		await buildValidatorAndVoteWallets(
			context.app.get(Identifiers.Cryptography.Identity.AddressFactory),
			5,
			context.walletRepo,
		);

		context.dposState.buildVoteBalances();
		context.dposState.buildValidatorRanking();
		context.round.maxValidators = 5;
		context.dposState.setValidatorsRound(context.round);

		context.blocks = makeChainedBlocks(101, context.factory.get("Block"));
	});

	afterEach((context) => {
		context.walletRepo.reset();
	});

	it("should get all delegates", async (context) => {
		const previousRound = await context.dposPreviousRoundStateProv([], context.round);

		assert.equal(previousRound.getAllValidators(), context.walletRepo.allByUsername());
	});

	it("should get round delegates", async (context) => {
		const previousRound = await context.dposPreviousRoundStateProv([], context.round);

		assert.containValues(previousRound.getRoundValidators(), context.walletRepo.allByUsername());
	});

	it("should revert blocks", async (context) => {
		const spyBuildDelegateRanking = spy(context.dposState, "buildValidatorRanking");
		const spySetDelegatesRound = spy(context.dposState, "setValidatorsRound");
		const spyRevertBlock = spy(context.blockState, "revertBlock");
		const spyGetLastBlock = stub(context.stateStore, "getLastBlock").returnValue({
			data: {
				height: 1,
			},
		});

		context.app.rebind(Identifiers.DposState).toConstantValue(context.dposState);
		context.app.rebind(Identifiers.BlockState).toConstantValue(context.blockState);
		context.app.rebind(Identifiers.StateStore).toConstantValue(context.stateStore);

		const generatorWallet = await context.walletRepo.findByPublicKey(context.blocks[0].data.generatorPublicKey);

		generatorWallet.setAttribute("delegate", {
			forgedFees: Utils.BigNumber.ZERO,
			forgedRewards: Utils.BigNumber.ZERO,
			lastBlock: undefined,
			producedBlocks: 0,
			username: "test",
		});

		context.walletRepo.index(generatorWallet);

		const voteBuilder = context.app.resolve<VoteBuilder>(VoteBuilder);

		addTransactionsToBlock(
			await makeVoteTransactions(voteBuilder, 3, [
				`+${"03287bfebba4c7881a0509717e71b34b63f31e40021c321f89ae04f84be6d6ac37"}`,
			]),
			context.blocks[0],
		);
		context.blocks[0].data.height = 2;

		await context.blockState.applyBlock(context.blocks[0]);

		await context.dposPreviousRoundStateProv([context.blocks[0]], context.round);

		spyGetLastBlock.calledOnce();
		spyBuildDelegateRanking.calledOnce();
		spySetDelegatesRound.calledWith(context.round);
		spyRevertBlock.calledWith(context.blocks[0]);
	});

	it("should not revert the blocks when height is one", async (context) => {
		const spyBuildDelegateRanking = spy(context.dposState, "buildValidatorRanking");
		const spySetDelegatesRound = spy(context.dposState, "setValidatorsRound");
		const spyRevertBlock = spy(context.blockState, "revertBlock");

		context.app.rebind(Identifiers.DposState).toConstantValue(context.dposState);
		context.app.rebind(Identifiers.BlockState).toConstantValue(context.blockState);

		context.blocks[0].data.height = 1;

		await context.dposPreviousRoundStateProv([context.blocks[0]], context.round);

		spyBuildDelegateRanking.calledOnce();
		spySetDelegatesRound.calledOnce();
		spyRevertBlock.neverCalled();
	});
});
