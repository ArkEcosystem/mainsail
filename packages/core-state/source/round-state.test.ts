import { Identifiers } from "@arkecosystem/core-contracts";
import { Application, Enums } from "@arkecosystem/core-kernel";
import Utils from "@arkecosystem/utils";

import { AddressFactory } from "../../core-crypto-address-base58/source/address.factory";
import { KeyPairFactory } from "../../core-crypto-key-pair-schnorr/source/pair";
import { PublicKeyFactory } from "../../core-crypto-key-pair-schnorr/source/public";
import { describeSkip, Sandbox } from "../../core-test-framework";
import block1760000 from "../test/fixtures/block1760000";
import { RoundState } from "./round-state";

const dummyBlock = { ...block1760000 };

const generateBlocks = (count: number): any[] => {
	const blocks: any[] = [];

	for (let index = 1; index <= count; index++) {
		blocks.push({
			data: {
				generatorPublicKey: "public_key_" + index,
				height: index,
				id: "id_" + index,
			},
		} as any);
	}

	return blocks;
};

const generateValidators = (count: number): any[] => {
	const validators: any[] = [];

	for (let index = 1; index <= count; index++) {
		const validator: any = {
			getAttribute: (key: string) => (key === "validator.username" ? "username_" + index : index),
			getPublicKey: () => "public_key_" + index,
			setAttribute: () => {},
			username: "username_" + index,
		};
		validator.clone = () => validator;
		validators.push(validator);
	}

	return validators;
};

describeSkip<{
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
	blockFactory: any;
}>("Round State", ({ it, assert, beforeAll, beforeEach, spy, stub, stubFn }) => {
	beforeAll((context) => {
		context.databaseService = {
			deleteRound: () => {},
			getBlocks: () => {},
			getLastBlock: () => {},
			getRound: () => {},
			saveRound: () => {},
		};

		context.dposState = {
			buildValidatorRanking: () => {},
			getRoundValidators: () => {},
			setValidatorsRound: () => {},
		};

		context.getDposPreviousRoundState = () => {};

		context.stateStore = {
			getCommonBlocks: () => {},
			getGenesisBlock: () => {},
			getLastBlock: () => {},
			getLastBlockIds: () => {},
			getLastBlocksByHeight: () => {},
			setGenesisBlock: () => {},
			setLastBlock: () => {},
		};

		context.walletRepository = {
			createWallet: () => {},
			findByPublicKey: () => {},
			findByUsername: () => {},
		};

		context.triggerService = {
			call: () => {},
		};

		context.eventDispatcher = {
			call: () => {},
			dispatch: () => {},
		};

		context.logger = {
			debug: () => {},
			error: () => {},
			info: () => {},
			warning: () => {},
		};

		context.blockFactory = {
			fromData: () => {},
		};

		const sandbox = new Sandbox();

		context.app = sandbox.app;

		sandbox.app.bind(Identifiers.Cryptography.Identity.AddressFactory).to(AddressFactory).inSingletonScope();
		sandbox.app.bind(Identifiers.Cryptography.Identity.PublicKeyFactory).to(PublicKeyFactory).inSingletonScope();
		sandbox.app.bind(Identifiers.Cryptography.Identity.KeyPairFactory).to(KeyPairFactory).inSingletonScope();

		sandbox.app.bind(Identifiers.Database.Service).toConstantValue(context.databaseService);
		sandbox.app.bind(Identifiers.DposState).toConstantValue(context.dposState);
		sandbox.app.bind(Identifiers.DposPreviousRoundStateProvider).toConstantValue(context.getDposPreviousRoundState);
		sandbox.app.bind(Identifiers.StateStore).toConstantValue(context.stateStore);
		sandbox.app.bind(Identifiers.WalletRepository).toConstantValue(context.walletRepository);
		sandbox.app.bind(Identifiers.TriggerService).toConstantValue(context.triggerService);
		sandbox.app.bind(Identifiers.EventDispatcherService).toConstantValue(context.eventDispatcher);
		sandbox.app.bind(Identifiers.LogService).toConstantValue(context.logger);

		sandbox.app.bind(Identifiers.Cryptography.Block.Factory).to(context.blockFactory).inSingletonScope();

		context.roundState = sandbox.app.resolve<RoundState>(RoundState);
	});

	beforeEach((context) => {
		context.blocks = generateBlocks(3);
	});

	it("getBlocksForRound - should return array of blocks when all requested blocks are in stateStore", async (context) => {
		const lastBlock = context.blocks[2];

		stub(context.stateStore, "getLastBlock").returnValue(lastBlock);
		const stateStoreStub2 = stub(context.stateStore, "getLastBlocksByHeight").returnValue(context.blocks);

		const spyOnFromData = stub(context.blockFactory, "fromData").callsFake((block) => block);

		// @ts-ignore
		assert.equal(await context.roundState.getBlocksForRound(), context.blocks);

		stateStoreStub2.calledWith(1, 3);
		spyOnFromData.calledTimes(3);
	});

	it("getBlocksForRound - should return array of blocks when only last block is in stateStore", async (context) => {
		const lastBlock = context.blocks[2];

		stub(context.stateStore, "getLastBlock").returnValue(lastBlock);
		const stateStoreStub2 = stub(context.stateStore, "getLastBlocksByHeight").returnValue([lastBlock]);
		const databaseServiceStub = stub(context.databaseService, "getBlocks").returnValue(context.blocks.slice(0, 2));

		const spyOnFromData = stub(context.blockFactory, "fromData").callsFake((block) => block);

		// @ts-ignore
		assert.equal(await context.roundState.getBlocksForRound(), context.blocks);

		stateStoreStub2.calledWith(1, 3);
		databaseServiceStub.calledWith(1, 2);
		spyOnFromData.calledTimes(3);
	});

	it("getActiveValidators - should return shuffled round validators", async (context) => {
		const lastBlock = dummyBlock;

		stub(context.stateStore, "getLastBlock").returnValue(lastBlock);

		const validatorPublicKey = "03287bfebba4c7881a0509717e71b34b63f31e40021c321f89ae04f84be6d6ac37";
		const validatorVoteBalance = Utils.BigNumber.make("100");
		const roundValidatorModel = { balance: validatorVoteBalance, publicKey: validatorPublicKey };

		stub(context.databaseService, "getRound").returnValueOnce([roundValidatorModel]);
		const cloneStub = stubFn();
		const setAttributeStub = stubFn();

		const newValidatorWallet = {
			clone: cloneStub,
			setAttribute: setAttributeStub,
			setPublicKey: () => {},
		};
		const walletRepoStub1 = stub(context.walletRepository, "createWallet").returnValue(newValidatorWallet);

		const getAttributeStub = stubFn();
		const oldValidatorWallet = { getAttribute: getAttributeStub };
		const walletRepoStub2 = stub(context.walletRepository, "findByPublicKey").returnValue(oldValidatorWallet);

		const validatorUsername = "test_validator";
		getAttributeStub.onFirstCall().returns(validatorUsername);

		const cloneDelegateWallet = {};
		cloneStub.onFirstCall().returns(cloneDelegateWallet);

		const spyOnShuffleDelegates = spy(context.roundState, "shuffleDelegates");

		await context.roundState.getActiveValidators();

		walletRepoStub2.calledWith(validatorPublicKey);
		walletRepoStub1.calledWith(Identities.Address.fromPublicKey(validatorPublicKey));
		assert.true(oldValidatorWallet.getAttribute.calledWith("validator.username"));
		assert.true(
			newValidatorWallet.setAttribute.calledWith("validator", {
				round: 34_510,
				username: validatorUsername,
				voteBalance: validatorVoteBalance,
			}),
		);
		assert.true(cloneStub.called);
		spyOnShuffleDelegates.called();
	});

	it("getActiveValidators - should return cached #forgingValidators when round is the same", async (context) => {
		const forgingDelegate = { getAttribute: () => {} };
		const forgingDelegateRound = 2;

		const getAttributeStub = stub(forgingDelegate, "getAttribute").returnValueOnce(forgingDelegateRound);

		// @ts-ignore
		context.roundState.forgingValidators = [forgingDelegate] as any;

		const roundInfo = { round: 2 };
		const result = await context.roundState.getActiveValidators(roundInfo as any);

		getAttributeStub.calledWith("validator.round");
		// @ts-ignore
		assert.equal(result, context.roundState.forgingValidators);
	});

	it("setForgingDelegatesOfRound - should call getActiveValidators and set #forgingDelegatValidators", async (context) => {
		const validator = {
			username: "dummy_validator",
		};

		const triggerStub = stub(context.triggerService, "call").returnValue([validator]);

		const roundInfo = { maxValidators: 51, nextRound: 3, round: 2, roundHeight: 2 };
		// @ts-ignore
		await context.roundState.setForgingDelegatesOfRound(roundInfo, [validator]);

		triggerStub.calledWith("getActiveValidators", {
			roundInfo,
			validators: [validator],
		});

		// @ts-ignore
		assert.equal(context.roundState.forgingValidators, [validator]);
	});

	it("setForgingDelegatesOfRound - should call getActiveValidators and set #forgingDelegatValidators to [] if undefined is returned", async (context) => {
		const validator = {
			username: "dummy_validator",
		};
		const triggerStub = stub(context.triggerService, "call").returnValue();

		const roundInfo = { maxValidators: 51, nextRound: 3, round: 2, roundHeight: 2 };
		// @ts-ignore
		await context.roundState.setForgingDelegatesOfRound(roundInfo, [validator]);

		triggerStub.calledWith("getActiveValidators", {
			roundInfo,
			validators: [validator],
		});

		// @ts-ignore
		assert.equal(context.roundState.forgingValidators, []);
	});

	it("applyRound - should build delegates, save round, dispatch events when height is 1", async (context) => {
		const eventStub = spy(context.eventDispatcher, "dispatch");
		const databaseServiceSpy = spy(context.databaseService, "saveRound");
		const dposStateBuildSpy = spy(context.dposState, "buildValidatorRanking");
		const dposStateSetSpy = spy(context.dposState, "setValidatorsRound");

		const forgingDelegate = {
			getAttribute: () => {},
			getPublicKey: () => {},
		};

		// @ts-ignore
		context.roundState.forgingValidators = [forgingDelegate] as any;

		// @ts-ignore
		context.roundState.blocksInCurrentRound = [];

		const getAttributeStub2 = stubFn();

		const validatorWallet = {
			getAttribute: getAttributeStub2,
			getPublicKey: () => "delegate public key",
		};

		const dposStateRoundDelegates = [validatorWallet];
		const dposGetStub = stub(context.dposState, "getRoundValidators");

		dposGetStub.returnValue(dposStateRoundDelegates);

		const delegateWalletRound = 1;
		getAttributeStub2.onFirstCall().returns(delegateWalletRound);

		stub(context.walletRepository, "findByPublicKey").returnValueOnce(validatorWallet);

		const delegateUsername = "test_delegate";
		getAttributeStub2.onSecondCall().returns(delegateUsername);

		const height = 1;
		// @ts-ignore
		await context.roundState.applyRound(height);

		dposStateBuildSpy.called();
		dposStateSetSpy.calledWith({
			maxValidators: 51,
			nextRound: 1,
			round: 1,
			roundHeight: 1,
		});
		databaseServiceSpy.calledWith(dposStateRoundDelegates);
		eventStub.calledWith("round.applied");
	});

	it("applyRound - should build delegates, save round, dispatch events, and skip missing round checks when first round has genesis block only", async (context) => {
		const eventStub = spy(context.eventDispatcher, "dispatch");
		const databaseServiceSpy = spy(context.databaseService, "saveRound");
		const dposStateBuildSpy = spy(context.dposState, "buildValidatorRanking");
		const dposStateSetSpy = spy(context.dposState, "setValidatorsRound");

		const forgingDelegateRound = 1;

		const getAttributeStub = stubFn().returns(forgingDelegateRound);

		const forgingDelegate = {
			getAttribute: getAttributeStub,
			getPublicKey: () => {},
		};

		// @ts-ignore
		context.roundState.forgingValidators = [forgingDelegate] as any;

		// @ts-ignore
		context.roundState.blocksInCurrentRound = [{ data: { height: 1 } }] as any;

		const getAttributeStub2 = stubFn();

		const delegateWallet = { getAttribute: getAttributeStub2, publicKey: "delegate public key" };
		const dposStateRoundDelegates = [delegateWallet];

		const dposGetStub = stub(context.dposState, "getRoundValidators");

		dposGetStub.returnValue(dposStateRoundDelegates);

		const delegateWalletRound = 2;

		getAttributeStub2.onFirstCall().returns(delegateWalletRound);

		stub(context.walletRepository, "findByPublicKey").returnValueOnce(delegateWallet);

		const delegateUsername = "test_delegate";
		getAttributeStub2.onSecondCall().returns(delegateUsername);

		const height = 51;
		// @ts-ignore
		await context.roundState.applyRound(height);

		dposStateBuildSpy.called();
		dposStateSetSpy.calledWith({
			maxValidators: 51,
			nextRound: 2,
			round: 2,
			roundHeight: 52,
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
		const delegates: any[] = generateValidators(51);

		const spyOnFromData = stub(context.blockFactory, "fromData").callsFake((block) => block);

		const databaseServiceSpy = spy(context.databaseService, "deleteRound");

		const block = blocksInPreviousRound[50];

		stub(context.stateStore, "getLastBlocksByHeight").returnValue(blocksInPreviousRound);
		stub(context.stateStore, "getLastBlock").returnValue(block);

		context.getDposPreviousRoundState = stubFn().returns({
			getActiveValidators: () => delegates,
			getAllValidators: () => delegates,
			getRoundValidators: () => delegates,
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
		const delegates: any[] = generateValidators(51);

		const spyOnFromData = stub(context.blockFactory, "fromData").callsFake((block) => block);

		const block = blocksInPreviousRound[50];

		stub(context.stateStore, "getLastBlocksByHeight").returnValue(blocksInPreviousRound);
		stub(context.stateStore, "getLastBlock").returnValue(block);

		context.getDposPreviousRoundState = stubFn().returns({
			getActiveValidators: () => delegates,
			getAllValidators: () => delegates,
			getRoundValidators: () => delegates,
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

		const databaseSpy = spy(context.databaseService, "deleteRound");
		const stateSpy = spy(context.stateStore, "getLastBlocksByHeight");

		// @ts-ignore
		context.roundState.blocksInCurrentRound = [blocks[0]];

		await assert.rejects(() => context.roundState.revertBlock(blocks[1]));

		// @ts-ignore
		assert.equal(context.roundState.blocksInCurrentRound, [blocks[0]]);
		databaseSpy.neverCalled();
		stateSpy.neverCalled();
	});

	it("restore - should restore blocksInCurrentRound and #forgingValidators when last block in middle of round", async (context) => {
		const delegates: any[] = generateValidators(51);
		const blocks: any[] = generateBlocks(3);

		const lastBlock = blocks[2];

		stub(context.stateStore, "getLastBlock").returnValue(lastBlock);
		stub(context.stateStore, "getLastBlocksByHeight").returnValue(blocks);
		const databaseServiceSpy = spy(context.databaseService, "deleteRound");

		const spyOnFromData = stub(context.blockFactory, "fromData").callsFake((block) => block);

		stub(context.triggerService, "call").returnValue(delegates);

		await context.roundState.restore();

		spyOnFromData.calledTimes(3);
		databaseServiceSpy.calledWith(2);

		// @ts-ignore
		assert.equal(context.roundState.blocksInCurrentRound, blocks);
		// @ts-ignore
		assert.equal(context.roundState.forgingValidators, delegates);
	});

	it("restore - should restore blocksInCurrentRound and #forgingValidators when last block is lastBlock of round", async (context) => {
		const delegates: any[] = generateValidators(51);
		const blocks: any[] = generateBlocks(51);

		const lastBlock = blocks[50];

		const eventSpy = spy(context.eventDispatcher, "dispatch");
		stub(context.stateStore, "getLastBlock").returnValue(lastBlock);
		stub(context.stateStore, "getLastBlocksByHeight").returnValue(blocks);
		stub(context.dposState, "getRoundValidators").returnValue(delegates);
		stub(context.triggerService, "call").returnValue(delegates);

		const spyOnFromData = stub(context.blockFactory, "fromData").callsFake((block) => block);

		const databaseDeleteSpy = spy(context.databaseService, "deleteRound");
		const databaseSaveSpy = spy(context.databaseService, "saveRound");

		await context.roundState.restore();

		databaseDeleteSpy.calledWith(2);
		databaseSaveSpy.calledWith(delegates);
		spyOnFromData.calledTimes(51);

		eventSpy.calledWith(Enums.RoundEvent.Applied);

		// @ts-ignore
		assert.equal(context.roundState.blocksInCurrentRound, []);
		// @ts-ignore
		assert.equal(context.roundState.forgingValidators, delegates);
	});

	it("restore - should throw if databaseService throws error", async (context) => {
		const delegates: any[] = generateValidators(51);
		const blocks: any[] = generateBlocks(51);

		const lastBlock = blocks[50];

		stub(context.stateStore, "getLastBlock").returnValue(lastBlock);
		stub(context.stateStore, "getLastBlocksByHeight").returnValue(blocks);
		stub(context.dposState, "getRoundValidators").returnValue(delegates);
		stub(context.triggerService, "call").returnValue(delegates);

		stub(context.blockFactory, "fromData").callsFake((block) => block);

		const databaseStub = stub(context.databaseService, "deleteRound").callsFake(() => {
			throw new Error("Database error");
		});

		await assert.rejects(() => context.roundState.restore());

		databaseStub.calledWith(2);
	});

	it("calcPreviousActiveDelegates - should return previous active delegates && set ranks", async (context) => {
		const delegates = generateValidators(51);
		const blocks = generateBlocks(51);

		stub(context.roundState, "getDposPreviousRoundState").returnValue({
			getActiveValidators: () => delegates,
			getAllValidators: () => delegates,
			getRoundValidators: () => delegates,
		});

		const setAttributeSpy = spy(delegates[0], "setAttribute");
		const walletRepoStub = stub(context.walletRepository, "findByUsername").callsFake((username) =>
			delegates.find((delegate) => delegate.username === username),
		);

		const roundInfo: any = { round: 1 };

		// @ts-ignore
		assert.equal(await context.roundState.calcPreviousActiveDelegates(roundInfo, blocks), delegates);

		walletRepoStub.calledTimes(51);
		setAttributeSpy.calledWith("delegate.rank", 1);
		setAttributeSpy.calledOnce();
	});

	it("detectMissedBlocks - should not detect missed round when stateStore.lastBlock is genesis block", async (context) => {
		// @ts-ignore
		context.roundState.forgingValidators = generateValidators(51);

		const block = {
			data: {
				height: 2,
			},
		};

		stub(context.stateStore, "getLastBlock").returnValue({
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
		context.roundState.forgingValidators = generateValidators(51);

		const block1 = {
			data: {
				height: 2,
				timestamp: 8,
			},
		};

		stub(context.stateStore, "getLastBlock").returnValue(block1);
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
		const delegates = generateValidators(51);
		// @ts-ignore
		context.roundState.forgingValidators = delegates;

		const block1 = {
			data: {
				height: 2,
				timestamp: 8,
			},
		};

		stub(context.stateStore, "getLastBlock").returnValue(block1);
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
		context.roundState.forgingValidators = generateValidators(51);

		const block1 = {
			data: {
				height: 2,
				timestamp: 8,
			},
		};

		stub(context.stateStore, "getLastBlock").returnValue(block1);
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
		const delegates = generateValidators(3);
		// @ts-ignore
		context.roundState.forgingValidators = delegates;
		const blocksInCurrentRound = generateBlocks(3);

		context.walletRepository.findByPublicKey = (publicKey) =>
			delegates.find((delegate) => delegate.getPublicKey() === publicKey);

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
		const delegates = generateValidators(3);
		// @ts-ignore
		context.roundState.forgingValidators = delegates;
		const blocksInCurrentRound = generateBlocks(3);

		context.walletRepository.findByPublicKey = (publicKey) =>
			delegates.find((delegate) => delegate.getPublicKey() === publicKey);

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
		const delegates = generateValidators(51);
		// @ts-ignore
		context.roundState.forgingValidators = delegates;

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
		const delegates = generateValidators(51);
		// @ts-ignore
		context.roundState.forgingValidators = delegates;

		// @ts-ignore
		context.roundState.blocksInCurrentRound = generateBlocks(50);

		const block = {
			data: {
				// Last block in round 1
				generatorPublicKey: "public_key_51",
				height: 51,
			},
		};

		const databaseServiceSpy = spy(context.databaseService, "saveRound");
		const eventSpy = spy(context.eventDispatcher, "dispatch");

		stub(context.dposState, "getRoundValidators").returnValue(delegates);
		stub(context.triggerService, "call").callsFake((name, arguments_) =>
			context.roundState.getActiveValidators(arguments_.roundInfo, arguments_.delegates),
		);

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
		const delegates = generateValidators(51);
		// @ts-ignore
		context.roundState.forgingValidators = delegates;

		// @ts-ignore
		context.roundState.blocksInCurrentRound = generateBlocks(50);

		const block = {
			data: {
				// Last block in round 1
				generatorPublicKey: "public_key_51",
				height: 51,
			},
		};

		const eventSpy = spy(context.eventDispatcher, "dispatch");

		stub(context.dposState, "getRoundValidators").returnValue(delegates);
		stub(context.triggerService, "call").callsFake((name, arguments_) =>
			context.roundState.getActiveValidators(arguments_.roundInfo, arguments_.delegates),
		);

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
