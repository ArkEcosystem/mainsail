import "jest-extended";

import { Container, Utils } from "@packages/core-kernel/source";
import { RoundInfo } from "@packages/core-kernel/source/contracts/shared";
import { DposPreviousRoundStateProvider } from "@packages/core-kernel/source/contracts/state";
import { DposState } from "@packages/core-state/source/dpos/dpos";
import { WalletRepository } from "@packages/core-state/source/wallets";
import { Interfaces } from "@packages/crypto";

import { buildDelegateAndVoteWallets } from "../__utils__/build-delegate-and-vote-balances";
import { makeChainedBlocks } from "../__utils__/make-chained-block";
import { makeVoteTransactions } from "../__utils__/make-vote-transactions";
import { addTransactionsToBlock } from "../__utils__/transactions";
import { setUp } from "../setup";

let dposState: DposState;
let dposPreviousRoundStateProv: DposPreviousRoundStateProvider;
let walletRepo: WalletRepository;
let factory;
let blockState;
let stateStore;

let initialEnv;

beforeAll(async () => {
	initialEnv = await setUp();
	dposState = initialEnv.dPosState;
	dposPreviousRoundStateProv = initialEnv.dposPreviousRound;
	walletRepo = initialEnv.walletRepo;
	factory = initialEnv.factory;
	blockState = initialEnv.blockState;
	stateStore = initialEnv.stateStore;
});

afterEach(() => jest.clearAllMocks());

describe("dposPreviousRound", () => {
	let round: RoundInfo;
	let blocks: Crypto.IBlock[];

	beforeEach(async () => {
		walletRepo.reset();

		round = Utils.roundCalculator.calculateRound(1);

		buildDelegateAndVoteWallets(5, walletRepo);

		dposState.buildVoteBalances();
		dposState.buildDelegateRanking();
		round.maxDelegates = 5;
		dposState.setDelegatesRound(round);

		blocks = makeChainedBlocks(101, factory.get("Block"));

		jest.clearAllMocks();
	});

	describe("getAllDelegates", () => {
		it("should get all delegates", async () => {
			const previousRound = await dposPreviousRoundStateProv([], round);

			expect(previousRound.getAllDelegates()).toEqual(walletRepo.allByUsername());
		});
	});

	describe("getRoundDelegates", () => {
		it("should get round delegates", async () => {
			const previousRound = await dposPreviousRoundStateProv([], round);

			expect(previousRound.getRoundDelegates()).toContainAllValues(walletRepo.allByUsername() as any);
		});
	});

	describe("revert", () => {
		it("should revert blocks", async () => {
			const spyBuildDelegateRanking = jest.spyOn(dposState, "buildDelegateRanking");
			const spySetDelegatesRound = jest.spyOn(dposState, "setDelegatesRound");
			const spyRevertBlock = jest.spyOn(blockState, "revertBlock");
			const spyGetLastBlock = jest.spyOn(stateStore, "getLastBlock").mockReturnValue({
				data: {
					height: 1,
				},
			});

			initialEnv.sandbox.app.rebind(Identifiers.DposState).toConstantValue(dposState);
			initialEnv.sandbox.app.rebind(Identifiers.BlockState).toConstantValue(blockState);
			initialEnv.sandbox.app.rebind(Identifiers.StateStore).toConstantValue(stateStore);

			const generatorWallet = walletRepo.findByPublicKey(blocks[0].data.generatorPublicKey);

			generatorWallet.setAttribute("delegate", {
				username: "test",
				forgedFees: Utils.BigNumber.ZERO,
				forgedRewards: Utils.BigNumber.ZERO,
				producedBlocks: 0,
				lastBlock: undefined,
			});

			walletRepo.index(generatorWallet);

			addTransactionsToBlock(
				makeVoteTransactions(3, [`+${"03287bfebba4c7881a0509717e71b34b63f31e40021c321f89ae04f84be6d6ac37"}`]),
				blocks[0],
			);
			blocks[0].data.height = 2;

			await blockState.applyBlock(blocks[0]);

			await dposPreviousRoundStateProv([blocks[0]], round);

			expect(spyGetLastBlock).toHaveBeenCalled();
			expect(spyBuildDelegateRanking).toHaveBeenCalled();
			expect(spySetDelegatesRound).toHaveBeenCalledWith(round);
			expect(spyRevertBlock).toHaveBeenCalledWith(blocks[0]);
		});

		it("should not revert the blocks when height is one", async () => {
			const spyBuildDelegateRanking = jest.spyOn(dposState, "buildDelegateRanking");
			const spySetDelegatesRound = jest.spyOn(dposState, "setDelegatesRound");
			const spyRevertBlock = jest.spyOn(blockState, "revertBlock");

			initialEnv.sandbox.app.rebind(Identifiers.DposState).toConstantValue(dposState);
			initialEnv.sandbox.app.rebind(Identifiers.BlockState).toConstantValue(blockState);

			blocks[0].data.height = 1;

			await dposPreviousRoundStateProv([blocks[0]], round);

			expect(spyBuildDelegateRanking).toHaveBeenCalled();
			expect(spySetDelegatesRound).toHaveBeenCalled();
			expect(spyRevertBlock).not.toHaveBeenCalled();
		});
	});
});
