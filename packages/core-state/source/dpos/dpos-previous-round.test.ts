import { Application, Container, Utils } from "@arkecosystem/core-kernel";
import { RoundInfo } from "@arkecosystem/core-kernel/source/contracts/shared";
import { DposPreviousRoundStateProvider } from "@arkecosystem/core-kernel/source/contracts/state";
import { DposState } from "./dpos";
import { WalletRepository } from "../wallets";
import { Interfaces } from "@arkecosystem/crypto";
import { buildDelegateAndVoteWallets } from "../../test/build-delegate-and-vote-balances";
import { makeChainedBlocks } from "../../test/make-chained-block";
import { makeVoteTransactions } from "../../test/make-vote-transactions";
import { addTransactionsToBlock } from "../../test/transactions";
import { setUp } from "../../test/setup";
import { describe, Factories } from "@arkecosystem/core-test-framework";
import { StateStore } from "../stores";
import { BlockState } from "../block-state";

describe<{
	app: Application;
	dposState: DposState;
	dposPreviousRoundStateProv: DposPreviousRoundStateProvider;
	walletRepo: WalletRepository;
	factory: Factories.FactoryBuilder;
	blockState: BlockState;
	stateStore: StateStore;
	round: RoundInfo;
	blocks: Interfaces.IBlock[];
}>("dposPreviousRound", ({ it, beforeAll, beforeEach, afterEach, assert, spy, stub }) => {
	beforeAll(async (context) => {
		const env = await setUp();

		context.app = env.sandbox.app;
		context.dposState = env.dPosState;
		context.dposPreviousRoundStateProv = env.dposPreviousRound;
		context.walletRepo = env.walletRepo;
		context.factory = env.factory;
		context.blockState = env.blockState;
		context.stateStore = env.stateStore;
	});

	beforeEach(async (context) => {
		context.walletRepo.reset();

		context.round = Utils.roundCalculator.calculateRound(1);

		buildDelegateAndVoteWallets(5, context.walletRepo);

		context.dposState.buildVoteBalances();
		context.dposState.buildDelegateRanking();
		context.round.maxDelegates = 5;
		context.dposState.setDelegatesRound(context.round);

		context.blocks = makeChainedBlocks(101, context.factory.get("Block"));
	});

	afterEach((context) => {
		context.walletRepo.reset();
	});

	it("should get all delegates", async (context) => {
		const previousRound = await context.dposPreviousRoundStateProv([], context.round);

		assert.equal(previousRound.getAllDelegates(), context.walletRepo.allByUsername());
	});

	it("should get round delegates", async (context) => {
		const previousRound = await context.dposPreviousRoundStateProv([], context.round);

		assert.containValues(previousRound.getRoundDelegates(), context.walletRepo.allByUsername() as any);
	});

	it("should revert blocks", async (context) => {
		const spyBuildDelegateRanking = spy(context.dposState, "buildDelegateRanking");
		const spySetDelegatesRound = spy(context.dposState, "setDelegatesRound");
		const spyRevertBlock = spy(context.blockState, "revertBlock");
		const spyGetLastBlock = stub(context.stateStore, "getLastBlock").returnValue({
			data: {
				height: 1,
			},
		});

		context.app.rebind(Container.Identifiers.DposState).toConstantValue(context.dposState);
		context.app.rebind(Container.Identifiers.BlockState).toConstantValue(context.blockState);
		context.app.rebind(Container.Identifiers.StateStore).toConstantValue(context.stateStore);

		const generatorWallet = context.walletRepo.findByPublicKey(context.blocks[0].data.generatorPublicKey);

		generatorWallet.setAttribute("delegate", {
			username: "test",
			forgedFees: Utils.BigNumber.ZERO,
			forgedRewards: Utils.BigNumber.ZERO,
			producedBlocks: 0,
			lastBlock: undefined,
		});

		context.walletRepo.index(generatorWallet);

		addTransactionsToBlock(
			makeVoteTransactions(3, [`+${"03287bfebba4c7881a0509717e71b34b63f31e40021c321f89ae04f84be6d6ac37"}`]),
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
		const spyBuildDelegateRanking = spy(context.dposState, "buildDelegateRanking");
		const spySetDelegatesRound = spy(context.dposState, "setDelegatesRound");
		const spyRevertBlock = spy(context.blockState, "revertBlock");

		context.app.rebind(Container.Identifiers.DposState).toConstantValue(context.dposState);
		context.app.rebind(Container.Identifiers.BlockState).toConstantValue(context.blockState);

		context.blocks[0].data.height = 1;

		await context.dposPreviousRoundStateProv([context.blocks[0]], context.round);

		spyBuildDelegateRanking.calledOnce();
		spySetDelegatesRound.calledOnce();
		spyRevertBlock.neverCalled();
	});
});
