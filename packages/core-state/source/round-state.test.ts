import { Application, Container, Enums } from "@arkecosystem/core-kernel";
import { RoundState } from "./round-state";
import { Blocks, Identities, Utils } from "@arkecosystem/crypto";
import { Sandbox, describe } from "@arkecosystem/core-test-framework";
import block1760000 from "../test/fixtures/block1760000";

const dummyBlock = Blocks.BlockFactory.fromData(block1760000);

const generateBlocks = (count: number): any[] => {
	const blocks: any[] = [];

	for (let i = 1; i <= count; i++) {
		blocks.push({
			data: {
				height: i,
				id: "id_" + i,
				generatorPublicKey: "public_key_" + i,
			},
		} as any);
	}

	return blocks;
};

const generateDelegates = (count: number): any[] => {
	const delegates: any[] = [];

	for (let i = 1; i <= count; i++) {
		const delegate: any = {
			getPublicKey: () => {
				return "public_key_" + i;
			},
			username: "username_" + i,
			getAttribute: (key: string) => {
				return key === "delegate.username" ? "username_" + i : i;
			},
			setAttribute: () => undefined,
		};
		delegate.clone = () => {
			return delegate;
		};
		delegates.push(delegate);
	}

	return delegates;
};

describe<{
	app: Application;
	databaseService: any;
	blocks: any[];
	dposState: any;
	eventDispatcher: any;
	getDposPreviousRoundState: any;
	logger: any;
	roundState: RoundState;
	stateStore: any;
	triggerService: any;
	walletRepository: any;
}>("Round State", ({ it, assert, beforeAll, beforeEach, spy, stub, stubFn }) => {
	beforeAll((context) => {
		context.databaseService = {
			getLastBlock: () => undefined,
			getBlocks: () => undefined,
			getRound: () => undefined,
			saveRound: () => undefined,
			deleteRound: () => undefined,
		};

		context.dposState = {
			buildDelegateRanking: () => undefined,
			setDelegatesRound: () => undefined,
			getRoundDelegates: () => undefined,
		};

		context.getDposPreviousRoundState = () => undefined;

		context.stateStore = {
			setGenesisBlock: () => undefined,
			getGenesisBlock: () => undefined,
			setLastBlock: () => undefined,
			getLastBlock: () => undefined,
			getLastBlocksByHeight: () => undefined,
			getCommonBlocks: () => undefined,
			getLastBlockIds: () => undefined,
		};

		context.walletRepository = {
			createWallet: () => undefined,
			findByPublicKey: () => undefined,
			findByUsername: () => undefined,
		};

		context.triggerService = {
			call: () => undefined,
		};

		context.eventDispatcher = {
			call: () => undefined,
			dispatch: () => undefined,
		};

		context.logger = {
			error: () => undefined,
			warning: () => undefined,
			info: () => undefined,
			debug: () => undefined,
		};

		const sandbox = new Sandbox();

		context.app = sandbox.app;

		sandbox.app.bind(Container.Identifiers.DatabaseService).toConstantValue(context.databaseService);
		sandbox.app.bind(Container.Identifiers.DposState).toConstantValue(context.dposState);
		sandbox.app
			.bind(Container.Identifiers.DposPreviousRoundStateProvider)
			.toConstantValue(context.getDposPreviousRoundState);
		sandbox.app.bind(Container.Identifiers.StateStore).toConstantValue(context.stateStore);
		sandbox.app.bind(Container.Identifiers.WalletRepository).toConstantValue(context.walletRepository);
		sandbox.app.bind(Container.Identifiers.TriggerService).toConstantValue(context.triggerService);
		sandbox.app.bind(Container.Identifiers.EventDispatcherService).toConstantValue(context.eventDispatcher);
		sandbox.app.bind(Container.Identifiers.LogService).toConstantValue(context.logger);

		context.roundState = sandbox.app.resolve<RoundState>(RoundState);
	});

	beforeEach((context) => {
		context.blocks = generateBlocks(3);
	});

	it("getBlocksForRound - should return array of blocks when all requested blocks are in stateStore", async (context) => {
		const lastBlock = context.blocks[2];

		const stateStoreStub = stub(context.stateStore, "getLastBlock").returnValue(lastBlock);
		const stateStoreStub2 = stub(context.stateStore, "getLastBlocksByHeight").returnValue(context.blocks);

		const spyOnFromData = stub(Blocks.BlockFactory, "fromData").callsFake((block) => {
			return block;
		});

		// @ts-ignore
		assert.equal(await context.roundState.getBlocksForRound(), context.blocks);

		stateStoreStub2.calledWith(1, 3);
		spyOnFromData.calledTimes(3);
	});

	it("getBlocksForRound - should return array of blocks when only last block is in stateStore", async (context) => {
		const lastBlock = context.blocks[2];

		const stateStoreStub = stub(context.stateStore, "getLastBlock").returnValue(lastBlock);
		const stateStoreStub2 = stub(context.stateStore, "getLastBlocksByHeight").returnValue([lastBlock]);
		const databaseServiceStub = stub(context.databaseService, "getBlocks").returnValue(context.blocks.slice(0, 2));

		const spyOnFromData = stub(Blocks.BlockFactory, "fromData").callsFake((block) => {
			return block;
		});

		// @ts-ignore
		assert.equal(await context.roundState.getBlocksForRound(), context.blocks);

		stateStoreStub2.calledWith(1, 3);
		databaseServiceStub.calledWith(1, 2);
		spyOnFromData.calledTimes(3);
	});

	it("getActiveDelegates - should return shuffled round delegates", async (context) => {
		const lastBlock = dummyBlock;

		const stateStub = stub(context.stateStore, "getLastBlock").returnValue(lastBlock);

		const delegatePublicKey = "03287bfebba4c7881a0509717e71b34b63f31e40021c321f89ae04f84be6d6ac37";
		const delegateVoteBalance = Utils.BigNumber.make("100");
		const roundDelegateModel = { publicKey: delegatePublicKey, balance: delegateVoteBalance };

		const dbStub = stub(context.databaseService, "getRound").returnValueOnce([roundDelegateModel]);

		const cloneStub = stubFn();
		const setAttributeStub = stubFn();

		const newDelegateWallet = {
			setAttribute: setAttributeStub,
			clone: cloneStub,
			setPublicKey: () => {},
		};
		const walletRepoStub1 = stub(context.walletRepository, "createWallet").returnValue(newDelegateWallet);

		const getAttributeStub = stubFn();
		const oldDelegateWallet = { getAttribute: getAttributeStub };
		const walletRepoStub2 = stub(context.walletRepository, "findByPublicKey").returnValue(oldDelegateWallet);

		const delegateUsername = "test_delegate";
		getAttributeStub.onFirstCall().returns(delegateUsername);

		const cloneDelegateWallet = {};
		cloneStub.onFirstCall().returns(cloneDelegateWallet);

		const spyOnShuffleDelegates = spy(context.roundState, "shuffleDelegates");

		await context.roundState.getActiveDelegates();

		walletRepoStub2.calledWith(delegatePublicKey);
		walletRepoStub1.calledWith(Identities.Address.fromPublicKey(delegatePublicKey));
		assert.true(oldDelegateWallet.getAttribute.calledWith("delegate.username"));
		assert.true(
			newDelegateWallet.setAttribute.calledWith("delegate", {
				voteBalance: delegateVoteBalance,
				username: delegateUsername,
				round: 34510,
			}),
		);
		assert.true(cloneStub.called);
		spyOnShuffleDelegates.called();
	});

	it("getActiveDelegates - should return cached forgingDelegates when round is the same", async (context) => {
		const forgingDelegate = { getAttribute: () => undefined };
		const forgingDelegateRound = 2;

		const getAttributeStub = stub(forgingDelegate, "getAttribute").returnValueOnce(forgingDelegateRound);

		// @ts-ignore
		context.roundState.forgingDelegates = [forgingDelegate] as any;

		const roundInfo = { round: 2 };
		const result = await context.roundState.getActiveDelegates(roundInfo as any);

		getAttributeStub.calledWith("delegate.round");
		// @ts-ignore
		assert.equal(result, context.roundState.forgingDelegates);
	});

	it("setForgingDelegatesOfRound - should call getActiveDelegates and set forgingDelegatesOfRound", async (context) => {
		const delegate = {
			username: "dummy_delegate",
		};

		const triggerStub = stub(context.triggerService, "call").returnValue([delegate]);

		const roundInfo = { round: 2, roundHeight: 2, nextRound: 3, maxDelegates: 51 };
		// @ts-ignore
		await context.roundState.setForgingDelegatesOfRound(roundInfo, [delegate]);

		triggerStub.calledWith("getActiveDelegates", {
			delegates: [delegate],
			roundInfo,
		});

		// @ts-ignore
		assert.equal(context.roundState.forgingDelegates, [delegate]);
	});

	it("setForgingDelegatesOfRound - should call getActiveDelegates and set forgingDelegatesOfRound to [] if undefined is returned", async (context) => {
		const delegate = {
			username: "dummy_delegate",
		};
		const triggerStub = stub(context.triggerService, "call").returnValue(undefined);

		const roundInfo = { round: 2, roundHeight: 2, nextRound: 3, maxDelegates: 51 };
		// @ts-ignore
		await context.roundState.setForgingDelegatesOfRound(roundInfo, [delegate]);

		triggerStub.calledWith("getActiveDelegates", {
			delegates: [delegate],
			roundInfo,
		});

		// @ts-ignore
		assert.equal(context.roundState.forgingDelegates, []);
	});

	it("applyRound - should build delegates, save round, dispatch events when height is 1", async (context) => {
		const eventStub = spy(context.eventDispatcher, "dispatch");
		const databaseServiceSpy = spy(context.databaseService, "saveRound");
		const dposStateBuildSpy = spy(context.dposState, "buildDelegateRanking");
		const dposStateSetSpy = spy(context.dposState, "setDelegatesRound");

		const forgingDelegate = {
			getAttribute: () => undefined,
			getPublicKey: () => undefined,
		};

		const forgingDelegateRound = 1;

		const getAttributeStub = stubFn().onFirstCall().returns(forgingDelegateRound);
		// @ts-ignore
		context.roundState.forgingDelegates = [forgingDelegate] as any;

		// @ts-ignore
		context.roundState.blocksInCurrentRound = [];

		const getAttributeStub2 = stubFn();

		const delegateWallet = {
			getPublicKey: () => "delegate public key",
			getAttribute: getAttributeStub2,
		};

		const dposStateRoundDelegates = [delegateWallet];
		const dposGetStub = stub(context.dposState, "getRoundDelegates");

		dposGetStub.returnValue(dposStateRoundDelegates);

		const delegateWalletRound = 1;
		getAttributeStub2.onFirstCall().returns(delegateWalletRound);

		const walletRepoStub = stub(context.walletRepository, "findByPublicKey").returnValueOnce(delegateWallet);

		const delegateUsername = "test_delegate";
		getAttributeStub2.onSecondCall().returns(delegateUsername);

		const height = 1;
		// @ts-ignore
		await context.roundState.applyRound(height);

		dposStateBuildSpy.called();
		dposStateSetSpy.calledWith({
			round: 1,
			nextRound: 1,
			roundHeight: 1,
			maxDelegates: 51,
		});
		databaseServiceSpy.calledWith(dposStateRoundDelegates);
		eventStub.calledWith("round.applied");
	});

	it("applyRound - should build delegates, save round, dispatch events, and skip missing round checks when first round has genesis block only", async (context) => {
		const eventStub = spy(context.eventDispatcher, "dispatch");
		const databaseServiceSpy = spy(context.databaseService, "saveRound");
		const dposStateBuildSpy = spy(context.dposState, "buildDelegateRanking");
		const dposStateSetSpy = spy(context.dposState, "setDelegatesRound");

		const forgingDelegateRound = 1;

		const getAttributeStub = stubFn().returns(forgingDelegateRound);

		const forgingDelegate = {
			getAttribute: getAttributeStub,
			getPublicKey: () => undefined,
		};

		// @ts-ignore
		context.roundState.forgingDelegates = [forgingDelegate] as any;

		// @ts-ignore
		context.roundState.blocksInCurrentRound = [{ data: { height: 1 } }] as any;

		const getAttributeStub2 = stubFn();

		const delegateWallet = { publicKey: "delegate public key", getAttribute: getAttributeStub2 };
		const dposStateRoundDelegates = [delegateWallet];

		const dposGetStub = stub(context.dposState, "getRoundDelegates");

		dposGetStub.returnValue(dposStateRoundDelegates);

		const delegateWalletRound = 2;

		getAttributeStub2.onFirstCall().returns(delegateWalletRound);

		const walletRepoStub = stub(context.walletRepository, "findByPublicKey").returnValueOnce(delegateWallet);

		const delegateUsername = "test_delegate";
		getAttributeStub2.onSecondCall().returns(delegateUsername);

		const height = 51;
		// @ts-ignore
		await context.roundState.applyRound(height);

		dposStateBuildSpy.called();
		dposStateSetSpy.calledWith({
			round: 2,
			nextRound: 2,
			roundHeight: 52,
			maxDelegates: 51,
		});
		databaseServiceSpy.calledWith(dposStateRoundDelegates);
		eventStub.calledWith("round.applied");
	});

	it("applyRound - should do nothing when next height is same round", async (context) => {
		const loggerSpy = spy(context.logger, "info");

		// @ts-ignore
		await context.roundState.applyRound(50);

		loggerSpy.neverCalled();
	});

	it("revertBlock - should remove last block from blocksInCurrentRound when block is in the same round", async (context) => {
		const block = {
			data: {
				height: 52, // First block of round 2
			},
		} as any;

		const databaseServiceSpy = spy(context.databaseService, "deleteRound");

		// @ts-ignore
		context.roundState.blocksInCurrentRound = [block];

		await context.roundState.revertBlock(block);

		// @ts-ignore
		assert.equal(context.roundState.blocksInCurrentRound, []);
		databaseServiceSpy.neverCalled();
	});

	it("revertBlock - should restore previous round, load previousRoundBlocks and delegates, remove last round from DB and remove last block from blocksInCurrentRound if block is last in round", async (context) => {
		const blocksInPreviousRound: any[] = generateBlocks(51);
		const delegates: any[] = generateDelegates(51);

		const spyOnFromData = stub(Blocks.BlockFactory, "fromData").callsFake((block) => {
			return block;
		});

		const databaseServiceSpy = spy(context.databaseService, "deleteRound");

		const block = blocksInPreviousRound[50];

		const stateStub1 = stub(context.stateStore, "getLastBlocksByHeight").returnValue(blocksInPreviousRound);
		const stateStub2 = stub(context.stateStore, "getLastBlock").returnValue(block);

		context.getDposPreviousRoundState = stubFn().returns({
			getAllDelegates: () => delegates,
			getActiveDelegates: () => delegates,
			getRoundDelegates: () => delegates,
		});

		const spyOnCalcPreviousActiveDelegates = stub(context.roundState, "calcPreviousActiveDelegates").returnValue(
			delegates,
		);

		// @ts-ignore
		assert.equal(context.roundState.blocksInCurrentRound, []);

		await context.roundState.revertBlock(block);

		spyOnCalcPreviousActiveDelegates.calledOnce();
		spyOnFromData.calledTimes(51);
		databaseServiceSpy.calledWith(2);
		// @ts-ignore
		assert.equal(context.roundState.blocksInCurrentRound.length, 50);
	});

	it("revertBlock - should throw error if databaseService throws error", async (context) => {
		const blocksInPreviousRound: any[] = generateBlocks(51);
		const delegates: any[] = generateDelegates(51);

		const spyOnFromData = stub(Blocks.BlockFactory, "fromData").callsFake((block) => {
			return block;
		});

		const block = blocksInPreviousRound[50];

		const stateStub1 = stub(context.stateStore, "getLastBlocksByHeight").returnValue(blocksInPreviousRound);
		const stateStub2 = stub(context.stateStore, "getLastBlock").returnValue(block);

		context.getDposPreviousRoundState = stubFn().returns({
			getAllDelegates: () => delegates,
			getActiveDelegates: () => delegates,
			getRoundDelegates: () => delegates,
		});

		const spyOnCalcPreviousActiveDelegates = stub(context.roundState, "calcPreviousActiveDelegates").returnValue(
			delegates,
		);

		const databaseServiceSpy = stub(context.databaseService, "deleteRound").callsFake(() => {
			throw new Error("Database error");
		});

		// @ts-ignore
		context.roundState.blocksInCurrentRound = [];

		// @ts-ignore
		assert.equal(context.roundState.blocksInCurrentRound, []);

		await assert.rejects(() => context.roundState.revertBlock(block));

		spyOnCalcPreviousActiveDelegates.calledOnce();
		spyOnFromData.calledTimes(51);
		databaseServiceSpy.calledWith(2);

		// @ts-ignore
		assert.equal(context.roundState.blocksInCurrentRound.length, 51);
	});

	it("revertBlock - should throw error if last blocks is not equal to block", async (context) => {
		const blocks = generateBlocks(2);

		const dbSpy = spy(context.databaseService, "deleteRound");
		const stateSpy = spy(context.stateStore, "getLastBlocksByHeight");

		// @ts-ignore
		context.roundState.blocksInCurrentRound = [blocks[0]];

		await assert.rejects(() => context.roundState.revertBlock(blocks[1]));

		// @ts-ignore
		assert.equal(context.roundState.blocksInCurrentRound, [blocks[0]]);
		dbSpy.neverCalled();
		stateSpy.neverCalled();
	});

	it("restore - should restore blocksInCurrentRound and forgingDelegates when last block in middle of round", async (context) => {
		const delegates: any[] = generateDelegates(51);
		const blocks: any[] = generateBlocks(3);

		const lastBlock = blocks[2];

		const getLastBlockStub = stub(context.stateStore, "getLastBlock").returnValue(lastBlock);
		const getLastBlocksByHeightHeight = stub(context.stateStore, "getLastBlocksByHeight").returnValue(blocks);
		const databaseServiceSpy = spy(context.databaseService, "deleteRound");

		const spyOnFromData = stub(Blocks.BlockFactory, "fromData").callsFake((block) => {
			return block;
		});

		const triggerStub = stub(context.triggerService, "call").returnValue(delegates);

		await context.roundState.restore();

		spyOnFromData.calledTimes(3);
		databaseServiceSpy.calledWith(2);

		// @ts-ignore
		assert.equal(context.roundState.blocksInCurrentRound, blocks);
		// @ts-ignore
		assert.equal(context.roundState.forgingDelegates, delegates);
	});

	it("restore - should restore blocksInCurrentRound and forgingDelegates when last block is lastBlock of round", async (context) => {
		const delegates: any[] = generateDelegates(51);
		const blocks: any[] = generateBlocks(51);

		const lastBlock = blocks[50];

		const eventSpy = spy(context.eventDispatcher, "dispatch");
		const stateStoreStub = stub(context.stateStore, "getLastBlock").returnValue(lastBlock);
		const stateStoreStub2 = stub(context.stateStore, "getLastBlocksByHeight").returnValue(blocks);
		const dposStub = stub(context.dposState, "getRoundDelegates").returnValue(delegates);
		const triggerStub = stub(context.triggerService, "call").returnValue(delegates);

		const spyOnFromData = stub(Blocks.BlockFactory, "fromData").callsFake((block) => {
			return block;
		});

		const dbDeleteSpy = spy(context.databaseService, "deleteRound");
		const dbSaveSpy = spy(context.databaseService, "saveRound");

		await context.roundState.restore();

		dbDeleteSpy.calledWith(2);
		dbSaveSpy.calledWith(delegates);
		spyOnFromData.calledTimes(51);

		eventSpy.calledWith(Enums.RoundEvent.Applied);

		// @ts-ignore
		assert.equal(context.roundState.blocksInCurrentRound, []);
		// @ts-ignore
		assert.equal(context.roundState.forgingDelegates, delegates);
	});

	it("restore - should throw if databaseService throws error", async (context) => {
		const delegates: any[] = generateDelegates(51);
		const blocks: any[] = generateBlocks(51);

		const lastBlock = blocks[50];

		const stateStoreStub = stub(context.stateStore, "getLastBlock").returnValue(lastBlock);
		const stateStoreStub2 = stub(context.stateStore, "getLastBlocksByHeight").returnValue(blocks);
		const dposStub = stub(context.dposState, "getRoundDelegates").returnValue(delegates);
		const triggerStub = stub(context.triggerService, "call").returnValue(delegates);

		const spyOnFromData = stub(Blocks.BlockFactory, "fromData").callsFake((block) => {
			return block;
		});

		const dbStub = stub(context.databaseService, "deleteRound").callsFake(() => {
			throw new Error("Database error");
		});

		await assert.rejects(() => context.roundState.restore());

		dbStub.calledWith(2);
	});

	it("calcPreviousActiveDelegates - should return previous active delegates && set ranks", async (context) => {
		const delegates = generateDelegates(51);
		const blocks = generateBlocks(51);

		const stubbedRoundState = stub(context.roundState, "getDposPreviousRoundState").returnValue({
			getAllDelegates: () => delegates,
			getActiveDelegates: () => delegates,
			getRoundDelegates: () => delegates,
		});

		const setAttributeSpy = spy(delegates[0], "setAttribute");
		const walletRepoStub = stub(context.walletRepository, "findByUsername").callsFake((username) => {
			return delegates.find((delegate) => delegate.username === username);
		});

		const roundInfo: any = { round: 1 };

		// @ts-ignore
		assert.equal(await context.roundState.calcPreviousActiveDelegates(roundInfo, blocks), delegates);

		walletRepoStub.calledTimes(51);
		setAttributeSpy.calledWith("delegate.rank", 1);
		setAttributeSpy.calledOnce();
	});

	it("detectMissedBlocks - should not detect missed round when stateStore.lastBlock is genesis block", async (context) => {
		// @ts-ignore
		context.roundState.forgingDelegates = generateDelegates(51);

		const block = {
			data: {
				height: 2,
			},
		};

		const stateStoreStub = stub(context.stateStore, "getLastBlock").returnValue({
			data: {
				height: 1,
			},
		});
		const loggerSpy = spy(context.logger, "debug");
		const eventSpy = spy(context.eventDispatcher, "dispatch");

		await context.roundState.detectMissedBlocks(block as any);

		loggerSpy.neverCalled();
		eventSpy.neverCalled();
	});

	it("detectMissedBlocks - should not detect missed block if slots are sequential", async (context) => {
		// @ts-ignore
		context.roundState.forgingDelegates = generateDelegates(51);

		const block1 = {
			data: {
				height: 2,
				timestamp: 8,
			},
		};

		const stateStoreStub = stub(context.stateStore, "getLastBlock").returnValue(block1);
		const loggerSpy = spy(context.logger, "debug");
		const eventSpy = spy(context.eventDispatcher, "dispatch");

		const block2 = {
			data: {
				height: 3,
				timestamp: 2 * 8,
			},
		};
		await context.roundState.detectMissedBlocks(block2 as any);

		loggerSpy.neverCalled();
		eventSpy.neverCalled();
	});

	it("detectMissedBlocks - should detect missed block if slots are not sequential", async (context) => {
		const delegates = generateDelegates(51);
		// @ts-ignore
		context.roundState.forgingDelegates = delegates;

		const block1 = {
			data: {
				height: 2,
				timestamp: 8,
			},
		};

		const stateStoreStub = stub(context.stateStore, "getLastBlock").returnValue(block1);
		const loggerSpy = spy(context.logger, "debug");
		const eventSpy = spy(context.eventDispatcher, "dispatch");

		const block2 = {
			data: {
				height: 3,
				timestamp: 3 * 8,
			},
		};
		await context.roundState.detectMissedBlocks(block2 as any);

		loggerSpy.calledOnce();
		eventSpy.calledOnce();
		eventSpy.calledWith(Enums.ForgerEvent.Missing, {
			delegate: delegates[2],
		});
	});

	it("detectMissedBlocks - should detect only one round if multiple rounds are missing", async (context) => {
		// @ts-ignore
		context.roundState.forgingDelegates = generateDelegates(51);

		const block1 = {
			data: {
				height: 2,
				timestamp: 8,
			},
		};

		const stateStoreStub = stub(context.stateStore, "getLastBlock").returnValue(block1);
		const loggerSpy = spy(context.logger, "debug");
		const eventSpy = spy(context.eventDispatcher, "dispatch");

		const block2 = {
			data: {
				height: 3,
				timestamp: 102 * 8,
			},
		};
		await context.roundState.detectMissedBlocks(block2 as any);

		loggerSpy.calledTimes(51);
		eventSpy.calledTimes(51);
	});

	it("detectMissedRound - should not detect missed round if all delegates forged blocks", (context) => {
		let delegates = generateDelegates(3);
		// @ts-ignore
		context.roundState.forgingDelegates = delegates;
		let blocksInCurrentRound = generateBlocks(3);

		context.walletRepository.findByPublicKey = (publicKey) => {
			return delegates.find((delegate) => delegate.getPublicKey() === publicKey);
		};

		// @ts-ignore
		context.roundState.blocksInCurrentRound = blocksInCurrentRound;

		const loggerSpy = spy(context.logger, "debug");
		const eventSpy = spy(context.eventDispatcher, "dispatch");

		// @ts-ignore
		context.roundState.detectMissedRound();

		loggerSpy.neverCalled();
		eventSpy.neverCalled();
	});

	it("detectMissedRound - should detect missed round", (context) => {
		let delegates = generateDelegates(3);
		// @ts-ignore
		context.roundState.forgingDelegates = delegates;
		let blocksInCurrentRound = generateBlocks(3);

		context.walletRepository.findByPublicKey = (publicKey) => {
			return delegates.find((delegate) => delegate.getPublicKey() === publicKey);
		};

		blocksInCurrentRound[2].data.generatorPublicKey = "public_key_1";

		const loggerSpy = spy(context.logger, "debug");
		const eventSpy = spy(context.eventDispatcher, "dispatch");

		// @ts-ignore
		context.roundState.blocksInCurrentRound = blocksInCurrentRound;

		// @ts-ignore
		context.roundState.detectMissedRound();

		loggerSpy.calledOnce();
		eventSpy.calledWith(Enums.RoundEvent.Missed, { delegate: delegates[2] });
	});

	it("applyBlock - should push block to blocksInCurrentRound and skip applyRound when block is not last block in round", async (context) => {
		let delegates = generateDelegates(51);
		// @ts-ignore
		context.roundState.forgingDelegates = delegates;

		const block = {
			data: {
				height: 52, // First block in round 2
			},
		};

		const databaseServiceSpy = spy(context.databaseService, "saveRound");

		// @ts-ignore
		context.roundState.blocksInCurrentRound = [];

		// @ts-ignore
		assert.equal(context.roundState.blocksInCurrentRound, []);

		await context.roundState.applyBlock(block as any);

		// @ts-ignore
		assert.equal(context.roundState.blocksInCurrentRound, [block]);
		databaseServiceSpy.neverCalled();
	});

	it("applyBlock - should push block to blocksInCurrentRound, applyRound, check missing round, calculate delegates, and clear blocksInCurrentRound when block is last in round", async (context) => {
		let delegates = generateDelegates(51);
		// @ts-ignore
		context.roundState.forgingDelegates = delegates;

		// @ts-ignore
		context.roundState.blocksInCurrentRound = generateBlocks(50);

		const block = {
			data: {
				height: 51, // Last block in round 1
				generatorPublicKey: "public_key_51",
			},
		};

		const databaseServiceSpy = spy(context.databaseService, "saveRound");
		const eventSpy = spy(context.eventDispatcher, "dispatch");

		const dposGetStub = stub(context.dposState, "getRoundDelegates").returnValue(delegates);
		const triggerStub = stub(context.triggerService, "call").callsFake((name, args) => {
			return context.roundState.getActiveDelegates(args.roundInfo, args.delegates);
		});

		const spyOnShuffleDelegates = spy(context.roundState, "shuffleDelegates");
		const spyOnDetectMissedRound = spy(context.roundState, "detectMissedRound");

		// @ts-ignore
		assert.equal(context.roundState.blocksInCurrentRound.length, 50);

		await context.roundState.applyBlock(block as any);

		// @ts-ignore
		assert.equal(context.roundState.blocksInCurrentRound, []);
		databaseServiceSpy.called();
		eventSpy.calledWith(Enums.RoundEvent.Applied);
		spyOnShuffleDelegates.called();
		spyOnDetectMissedRound.called();

		eventSpy.notCalledWith(Enums.RoundEvent.Missed);
	});

	// TODO: Check how we can restore
	it("applyBlock - should throw error if databaseService.saveRound throws error", async (context) => {
		let delegates = generateDelegates(51);
		// @ts-ignore
		context.roundState.forgingDelegates = delegates;

		// @ts-ignore
		context.roundState.blocksInCurrentRound = generateBlocks(50);

		const block = {
			data: {
				height: 51, // Last block in round 1
				generatorPublicKey: "public_key_51",
			},
		};

		const eventSpy = spy(context.eventDispatcher, "dispatch");

		const dposGetStub = stub(context.dposState, "getRoundDelegates").returnValue(delegates);
		const triggerStub = stub(context.triggerService, "call").callsFake((name, args) => {
			return context.roundState.getActiveDelegates(args.roundInfo, args.delegates);
		});

		const spyOnShuffleDelegates = spy(context.roundState, "shuffleDelegates");
		const spyOnDetectMissedRound = spy(context.roundState, "detectMissedRound");

		const databaseServiceSpy = stub(context.databaseService, "saveRound").callsFake(() => {
			throw new Error("Cannot save round");
		});

		// @ts-ignore
		assert.equal(context.roundState.blocksInCurrentRound.length, 50);

		await assert.rejects(() => context.roundState.applyBlock(block as any));

		// @ts-ignore
		assert.equal(context.roundState.blocksInCurrentRound.length, 51);
		databaseServiceSpy.called();
		eventSpy.neverCalled();
		spyOnShuffleDelegates.called();
		spyOnDetectMissedRound.called();

		eventSpy.notCalledWith(Enums.RoundEvent.Missed);
	});

	// TODO: Check genesisBlock if required
});
