import type { Contracts } from "@mainsail/contracts";

import { Events, Identifiers, ZeroHash } from "@mainsail/constants";
import { InvalidFee, InvalidGasUsed, InvalidLogsBloom, InvalidStateRoot } from "@mainsail/exceptions";
import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";

import { BlockProcessor } from "./block-processor.js";

const blockNumber = 3;
const blockData = { hash: "block-hash" };
const commitKey = { blockHash: "block-hash", blockNumber: BigInt(blockNumber), round: 1n };
const previousBlock = {
	hash: "parent-hash",
	number: blockNumber - 1,
	randaoReveal: "ab".repeat(96),
	stateRoot: "parent-state-root",
};
const prevrandao = Buffer.from("cc".repeat(32), "hex");

const makeTransaction = (index: number, overrides: Record<string, unknown> = {}) => ({
	gasPrice: 5,
	hash: `hash-${index}`,
	...overrides,
});

const makeBlock = (overrides: Record<string, unknown> = {}) => ({
	fee: 0n,
	gasUsed: 0,
	hash: "block-hash",
	logsBloom: "logs-bloom",
	number: blockNumber,
	proposer: "proposer",
	round: 1,
	stateRoot: "state-root",
	timestamp: 1_700_000_000,
	toData: () => blockData,
	transactions: [] as ReturnType<typeof makeTransaction>[],
	transactionsCount: 0,
	...overrides,
});

const makeUnit = (block: ReturnType<typeof makeBlock>, overrides: Record<string, unknown> = {}) =>
	({
		blockNumber: block.number,
		getBlock: () => block,
		getCommit: async () => ({ block }),
		getContractEvents: () => [],
		round: block.round,
		...overrides,
	}) as unknown as Contracts.Processor.ProcessableUnit;

// Lets the fire-and-forget dispatch rejection reach its catch handler.
const settle = async () => new Promise((resolve) => setImmediate(resolve));

describe<{
	apiSync: any;
	app: Application;
	configuration: any;
	databaseService: any;
	events: any;
	evm: any;
	evmWorker: any;
	feeCalculator: any;
	hashFactory: any;
	logger: any;
	milestone: any;
	nextMilestone: any;
	processor: BlockProcessor;
	processorWithoutApiSync: BlockProcessor;
	roundCalculator: any;
	state: any;
	stateStore: any;
	transactionProcessor: any;
	txPoolWorker: any;
	validatorSet: any;
	verifier: any;
}>("BlockProcessor", ({ it, beforeEach, assert, spy, stub }) => {
	const bindDependencies = (context: any): Application => {
		const app = new Application();
		app.bind(Identifiers.State.Store).toConstantValue(context.stateStore);
		app.bind(Identifiers.State.State).toConstantValue(context.state);
		app.bind(Identifiers.Cryptography.Configuration).toConstantValue(context.configuration);
		app.bind(Identifiers.BlockchainUtils.RoundCalculator).toConstantValue(context.roundCalculator);
		app.bind(Identifiers.Database.Service).toConstantValue(context.databaseService);
		app.bind(Identifiers.Evm.Instance).toConstantValue(context.evm).whenTagged("instance", "evm");
		app.bind(Identifiers.Processor.TransactionProcessor).toConstantValue(context.transactionProcessor);
		app.bind(Identifiers.Services.EventDispatcher.Service).toConstantValue(context.events);
		app.bind(Identifiers.Services.Log.Service).toConstantValue(context.logger);
		app.bind(Identifiers.ValidatorSet.Service).toConstantValue(context.validatorSet);
		app.bind(Identifiers.Processor.BlockVerifier).toConstantValue(context.verifier);
		app.bind(Identifiers.TransactionPool.Worker).toConstantValue(context.txPoolWorker);
		app.bind(Identifiers.Evm.Worker).toConstantValue(context.evmWorker);
		app.bind(Identifiers.BlockchainUtils.FeeCalculator).toConstantValue(context.feeCalculator);
		app.bind(Identifiers.Cryptography.Hash.Factory).toConstantValue(context.hashFactory);

		return app;
	};

	const reportedInvalid = (
		dispatch: ReturnType<typeof spy>,
		constructor: new (...arguments_: any[]) => Error,
		message: string,
	) => {
		dispatch.calledOnce();

		const [event, payload] = dispatch.getCallArgs(0) as [string, { block: unknown; error: Error }];
		assert.equal(event, Events.BlockEvent.Invalid);
		assert.is(payload.block, blockData);
		assert.instance(payload.error, constructor);
		assert.match(payload.error.message, message);
	};

	beforeEach((context) => {
		context.milestone = {
			block: { maxGasLimit: 100_000 },
			evmSpec: "Latest",
			reward: "2000000000",
		};
		context.nextMilestone = {
			evmSpec: "Next",
			roundValidators: 53,
			validatorRegistrationFee: "250000000000000000000",
		};
		context.configuration = {
			getGenesisHeight: () => 0,
			getMilestone: (height: number) => (height === blockNumber + 1 ? context.nextMilestone : context.milestone),
		};

		context.evm = {
			calculateRoundValidators: async () => {},
			logsBloom: async () => "logs-bloom",
			onCommit: async () => {},
			prepareNextCommit: async () => {},
			stateRoot: async () => "state-root",
			updateRewardsAndVotes: async () => {},
			updateValidatorRegistrationFee: async () => {},
		};
		context.transactionProcessor = { process: async () => ({ gasUsed: 21_000n }) };
		context.feeCalculator = {
			calculateConsumed: (gasPrice: number, gasUsed: bigint) => BigInt(gasPrice) * gasUsed,
		};
		context.hashFactory = { keccak256: () => prevrandao };
		context.roundCalculator = {
			calculateRound: () => ({ maxValidators: 53, round: 2, roundHeight: blockNumber + 1 }),
			isNewRound: () => false,
		};
		context.state = { isBootstrap: () => false };
		context.stateStore = { getLastBlock: () => previousBlock, onCommit: async () => {} };
		context.databaseService = { onCommit: async () => {} };
		context.validatorSet = { onCommit: async () => {} };
		context.txPoolWorker = { onCommit: async () => {} };
		context.evmWorker = { onCommit: async () => {} };
		context.apiSync = { flush: async () => {}, onCommit: async () => {} };
		context.events = { dispatch: async () => {} };
		context.logger = { debug: () => {}, error: () => {}, info: () => {} };
		context.verifier = { verify: async () => {} };

		context.app = bindDependencies(context);
		context.app.bind(Identifiers.ApiSync.Service).toConstantValue(context.apiSync);
		context.processor = context.app.resolve(BlockProcessor);

		// The api sync service is optional; this instance runs without one.
		context.processorWithoutApiSync = bindDependencies(context).resolve(BlockProcessor);
	});

	it("#process - should verify the unit and settle a valid block against the evm", async ({
		evm,
		processor,
		transactionProcessor,
		verifier,
	}) => {
		const transaction1 = makeTransaction(1);
		const transaction2 = makeTransaction(2, { gasPrice: 10 });
		const block = makeBlock({ fee: 405_000n, gasUsed: 51_000, transactions: [transaction1, transaction2] });
		const unit = makeUnit(block);

		const verify = spy(verifier, "verify");
		const prepareNextCommit = spy(evm, "prepareNextCommit");
		const process = stub(transactionProcessor, "process").resolvedValueSequence([
			{ gasUsed: 21_000n },
			{ gasUsed: 30_000n },
		]);
		const updateRewardsAndVotes = spy(evm, "updateRewardsAndVotes");
		const stateRoot = spy(evm, "stateRoot");
		const logsBloom = spy(evm, "logsBloom");

		const result = await processor.process(unit);

		assert.equal(result, {
			feeUsed: 405_000n,
			gasUsed: 51_000,
			receipts: new Map([
				["hash-1", { gasUsed: 21_000n }],
				["hash-2", { gasUsed: 30_000n }],
			]),
			success: true,
		});
		verify.calledWith(unit);
		prepareNextCommit.calledWith({
			blockContext: {
				commitKey,
				gasLimit: 100_000n,
				prevrandao,
				timestamp: 1_700_000_000n,
				validatorAddress: "proposer",
			},
		});
		process.calledTimes(2);
		process.calledNthWith(0, block, transaction1);
		process.calledNthWith(1, block, transaction2);
		updateRewardsAndVotes.calledWith({
			blockReward: 2_000_000_000n,
			commitKey,
			specId: "Latest",
			timestamp: 1_700_000_000n,
			validatorAddress: "proposer",
		});
		stateRoot.calledWith(commitKey, "parent-state-root");
		logsBloom.calledWith(commitKey);
	});

	it("#process - should settle the evm in the order the forger used to build the block", async ({
		evm,
		processor,
		roundCalculator,
		transactionProcessor,
		verifier,
	}) => {
		roundCalculator.isNewRound = () => true;

		const calls: string[] = [];
		const record = (owner: any, method: string, result?: unknown) => {
			owner[method] = async () => {
				calls.push(method);
				return result;
			};
		};
		record(verifier, "verify");
		record(evm, "prepareNextCommit");
		record(transactionProcessor, "process", { gasUsed: 21_000n });
		record(evm, "updateRewardsAndVotes");
		record(evm, "updateValidatorRegistrationFee");
		record(evm, "calculateRoundValidators");
		record(evm, "stateRoot", "state-root");
		record(evm, "logsBloom", "logs-bloom");

		const result = await processor.process(
			makeUnit(makeBlock({ fee: 105_000n, gasUsed: 21_000, transactions: [makeTransaction(1)] })),
		);

		assert.true(result.success);
		assert.equal(calls, [
			"verify",
			"prepareNextCommit",
			"process",
			"updateRewardsAndVotes",
			"updateValidatorRegistrationFee",
			"calculateRoundValidators",
			"stateRoot",
			"logsBloom",
		]);
	});

	it("#process - should process every transaction of a large block", async ({ processor, transactionProcessor }) => {
		const transactions = Array.from({ length: 45 }, (_, index) => makeTransaction(index));
		transactionProcessor.process = async () => ({ gasUsed: 1000n });

		const result = await processor.process(makeUnit(makeBlock({ fee: 225_000n, gasUsed: 45_000, transactions })));

		assert.true(result.success);
		assert.equal(result.gasUsed, 45_000);
		assert.equal(result.feeUsed, 225_000n);
		assert.equal(
			[...result.receipts.keys()],
			transactions.map((transaction) => transaction.hash),
		);
	});

	it("#process - should settle the genesis block against a zero prevrandao and an empty previous state root", async ({
		evm,
		hashFactory,
		processor,
		stateStore,
	}) => {
		const prepareNextCommit = spy(evm, "prepareNextCommit");
		const stateRoot = spy(evm, "stateRoot");
		const keccak256 = spy(hashFactory, "keccak256");
		const getLastBlock = spy(stateStore, "getLastBlock");

		const result = await processor.process(makeUnit(makeBlock({ number: 0 })));

		assert.true(result.success);
		prepareNextCommit.calledWith({
			blockContext: {
				commitKey: { ...commitKey, blockNumber: 0n },
				gasLimit: 100_000n,
				prevrandao: Buffer.alloc(32),
				timestamp: 1_700_000_000n,
				validatorAddress: "proposer",
			},
		});
		stateRoot.calledWith({ ...commitKey, blockNumber: 0n }, ZeroHash);
		keccak256.neverCalled();
		getLastBlock.neverCalled();
	});

	it("#process - should settle the genesis block on top of the snapshot state root", async ({
		evm,
		milestone,
		processor,
	}) => {
		milestone.snapshot = { previousGenesisBlockHash: "previous-genesis-hash", snapshotHash: "snapshot-hash" };
		const stateRoot = spy(evm, "stateRoot");

		await processor.process(makeUnit(makeBlock({ number: 0 })));

		stateRoot.calledWith({ ...commitKey, blockNumber: 0n }, "snapshot-hash");
	});

	it("#process - should take the genesis height from the configuration", async ({
		configuration,
		evm,
		hashFactory,
		processor,
	}) => {
		configuration.getGenesisHeight = () => blockNumber;
		const keccak256 = spy(hashFactory, "keccak256");
		const stateRoot = spy(evm, "stateRoot");

		const result = await processor.process(makeUnit(makeBlock()));

		assert.true(result.success);
		keccak256.neverCalled();
		stateRoot.calledWith(commitKey, ZeroHash);
	});

	it("#process - should update the registration fee and the round validators from the next milestone when the block closes a round", async ({
		evm,
		processor,
		roundCalculator,
	}) => {
		const isNewRound = stub(roundCalculator, "isNewRound").callsFake((height) => height === blockNumber + 1);
		const updateValidatorRegistrationFee = spy(evm, "updateValidatorRegistrationFee");
		const calculateRoundValidators = spy(evm, "calculateRoundValidators");

		const result = await processor.process(makeUnit(makeBlock()));

		assert.true(result.success);
		isNewRound.calledWith(blockNumber + 1);
		updateValidatorRegistrationFee.calledOnce();
		updateValidatorRegistrationFee.calledWith({
			commitKey,
			fee: 250_000_000_000_000_000_000n,
			specId: "Next",
			timestamp: 1_700_000_000n,
			validatorAddress: "proposer",
		});
		calculateRoundValidators.calledOnce();
		calculateRoundValidators.calledWith({
			commitKey,
			roundValidators: 53n,
			specId: "Next",
			timestamp: 1_700_000_000n,
			validatorAddress: "proposer",
		});
	});

	it("#process - should leave the round validators alone when the block does not close a round", async ({
		evm,
		processor,
	}) => {
		const updateValidatorRegistrationFee = spy(evm, "updateValidatorRegistrationFee");
		const calculateRoundValidators = spy(evm, "calculateRoundValidators");

		const result = await processor.process(makeUnit(makeBlock()));

		assert.true(result.success);
		updateValidatorRegistrationFee.neverCalled();
		calculateRoundValidators.neverCalled();
	});

	it("#process - should reject a block that fails verification and report it", async ({
		events,
		evm,
		logger,
		processor,
		verifier,
	}) => {
		const error = new Error("verification failed");
		stub(verifier, "verify").rejectedValue(error);
		const prepareNextCommit = spy(evm, "prepareNextCommit");
		const dispatch = spy(events, "dispatch");
		const logError = spy(logger, "error");

		const result = await processor.process(makeUnit(makeBlock()));

		assert.equal(result, { feeUsed: 0n, gasUsed: 0, receipts: new Map(), success: false });
		prepareNextCommit.neverCalled();
		dispatch.calledOnce();
		dispatch.calledWith(Events.BlockEvent.Invalid, { block: blockData, error });
		logError.calledWith("Cannot process block because: verification failed", "consensus");
	});

	it("#process - should wrap a non-error rejection before reporting it", async ({
		events,
		logger,
		processor,
		verifier,
	}) => {
		verifier.verify = async () => {
			throw "verification failed";
		};
		const dispatch = spy(events, "dispatch");
		const logError = spy(logger, "error");

		const result = await processor.process(makeUnit(makeBlock()));

		assert.false(result.success);
		reportedInvalid(dispatch, Error, "verification failed");
		logError.calledWith("Cannot process block because: verification failed", "consensus");
	});

	it("#process - should reject a transaction that consumes more gas than the block declares", async ({
		events,
		evm,
		processor,
	}) => {
		const dispatch = spy(events, "dispatch");
		const updateRewardsAndVotes = spy(evm, "updateRewardsAndVotes");

		const result = await processor.process(
			makeUnit(
				makeBlock({ fee: 210_000n, gasUsed: 30_000, transactions: [makeTransaction(1), makeTransaction(2)] }),
			),
		);

		assert.false(result.success);
		assert.equal(result.gasUsed, 21_000);
		reportedInvalid(dispatch, InvalidGasUsed, "Expected 30000, but consumed 42000");
		updateRewardsAndVotes.neverCalled();
	});

	it("#process - should reject a block whose transactions consume less gas than it declares", async ({
		events,
		evm,
		processor,
	}) => {
		const dispatch = spy(events, "dispatch");
		const updateRewardsAndVotes = spy(evm, "updateRewardsAndVotes");

		const result = await processor.process(
			makeUnit(makeBlock({ fee: 105_000n, gasUsed: 51_000, transactions: [makeTransaction(1)] })),
		);

		assert.false(result.success);
		reportedInvalid(dispatch, InvalidGasUsed, "Expected 51000, but consumed 21000");
		updateRewardsAndVotes.neverCalled();
	});

	it("#process - should reject a transaction that pays more fee than the block declares", async ({
		events,
		processor,
	}) => {
		const dispatch = spy(events, "dispatch");

		const result = await processor.process(
			makeUnit(makeBlock({ fee: 100_000n, gasUsed: 21_000, transactions: [makeTransaction(1)] })),
		);

		assert.false(result.success);
		assert.equal(result.feeUsed, 0n);
		reportedInvalid(dispatch, InvalidFee, "Expected 100000, but consumed 105000");
	});

	it("#process - should reject a block whose transactions pay less fee than it declares", async ({
		events,
		evm,
		processor,
	}) => {
		const dispatch = spy(events, "dispatch");
		const updateRewardsAndVotes = spy(evm, "updateRewardsAndVotes");

		const result = await processor.process(
			makeUnit(makeBlock({ fee: 200_000n, gasUsed: 21_000, transactions: [makeTransaction(1)] })),
		);

		assert.false(result.success);
		reportedInvalid(dispatch, InvalidFee, "Expected 200000, but consumed 105000");
		updateRewardsAndVotes.neverCalled();
	});

	it("#process - should reject a block with a wrong state root", async ({ events, evm, processor }) => {
		stub(evm, "stateRoot").resolvedValue("other-state-root");
		const dispatch = spy(events, "dispatch");
		const logsBloom = spy(evm, "logsBloom");

		const result = await processor.process(makeUnit(makeBlock()));

		assert.false(result.success);
		reportedInvalid(dispatch, InvalidStateRoot, "Expected state-root, but got other-state-root");
		logsBloom.neverCalled();
	});

	it("#process - should reject a block with a wrong logs bloom", async ({ events, evm, processor }) => {
		stub(evm, "logsBloom").resolvedValue("other-logs-bloom");
		const dispatch = spy(events, "dispatch");

		const result = await processor.process(makeUnit(makeBlock()));

		assert.false(result.success);
		reportedInvalid(dispatch, InvalidLogsBloom, "Expected logs-bloom, but got other-logs-bloom");
	});

	it("#process - should not report an invalid block while bootstrapping", async ({
		events,
		logger,
		processor,
		state,
		verifier,
	}) => {
		state.isBootstrap = () => true;
		stub(verifier, "verify").rejectedValue(new Error("verification failed"));
		const dispatch = spy(events, "dispatch");
		const logError = spy(logger, "error");

		const result = await processor.process(makeUnit(makeBlock()));

		assert.false(result.success);
		dispatch.neverCalled();
		logError.calledOnce();
	});

	it("#process - should log a failing invalid-block report instead of throwing", async ({
		events,
		logger,
		processor,
		verifier,
	}) => {
		stub(verifier, "verify").rejectedValue(new Error("verification failed"));
		stub(events, "dispatch").rejectedValue(new Error("dispatch failed"));
		const logError = spy(logger, "error");

		await processor.process(makeUnit(makeBlock()));
		await settle();

		logError.calledTimes(2);
		assert.startsWith(
			logError.getCallArgs(1)[0] as string,
			"Dispatching block.invalid failed: Error: dispatch failed",
		);
	});

	it("#process - should fall back to the message of a dispatch error without a stack", async ({
		events,
		logger,
		processor,
		verifier,
	}) => {
		stub(verifier, "verify").rejectedValue(new Error("verification failed"));
		const dispatchError = new Error("dispatch failed");
		dispatchError.stack = undefined;
		stub(events, "dispatch").rejectedValue(dispatchError);
		const logError = spy(logger, "error");

		await processor.process(makeUnit(makeBlock()));
		await settle();

		logError.calledNthWith(1, "Dispatching block.invalid failed: dispatch failed", "consensus");
	});

	it("#commit - should run the commit handlers in order and announce the block", async ({
		apiSync,
		databaseService,
		events,
		evm,
		evmWorker,
		logger,
		processor,
		stateStore,
		txPoolWorker,
		validatorSet,
	}) => {
		const calls: string[] = [];
		const record = (owner: any, method: string, name: string) => {
			owner[method] = async () => {
				calls.push(name);
			};
		};
		record(apiSync, "flush", "apiSync.flush");
		record(evm, "onCommit", "evm");
		record(stateStore, "onCommit", "stateStore");
		record(databaseService, "onCommit", "databaseService");
		record(validatorSet, "onCommit", "validatorSet");
		record(txPoolWorker, "onCommit", "txPoolWorker");
		record(evmWorker, "onCommit", "evmWorker");
		record(apiSync, "onCommit", "apiSync");

		const transaction1 = makeTransaction(1);
		const transaction2 = makeTransaction(2);
		const block = makeBlock({ gasUsed: 51_000, transactions: [transaction1, transaction2], transactionsCount: 2 });
		const contractEvents = [{ name: "Voted" }];
		const dispatch = spy(events, "dispatch");
		const info = spy(logger, "info");

		await processor.commit(makeUnit(block, { getContractEvents: () => contractEvents }));

		assert.equal(calls, [
			"apiSync.flush",
			"evm",
			"stateStore",
			"databaseService",
			"validatorSet",
			"txPoolWorker",
			"evmWorker",
			"apiSync",
		]);
		dispatch.calledTimes(3);
		dispatch.calledNthWith(0, Events.TransactionEvent.Applied, transaction1);
		dispatch.calledNthWith(1, Events.TransactionEvent.Applied, transaction2);
		dispatch.calledNthWith(2, Events.BlockEvent.Applied, { ...blockData, contractEvents });
		info.calledWith("Committed block 3/1/block-hash with 2 tx(s) (gasUsed=51,000)", "consensus");
	});

	it("#commit - should hand the unit to every commit handler", async ({
		apiSync,
		databaseService,
		evm,
		evmWorker,
		processor,
		stateStore,
		txPoolWorker,
		validatorSet,
	}) => {
		const handlers = [evm, stateStore, databaseService, validatorSet, txPoolWorker, evmWorker, apiSync].map(
			(owner) => spy(owner, "onCommit"),
		);
		const flush = spy(apiSync, "flush");
		const unit = makeUnit(makeBlock());

		await processor.commit(unit);

		flush.calledOnce();
		for (const handler of handlers) {
			handler.calledOnce();
			handler.calledWith(unit);
		}
	});

	it("#commit - should log the block round when it differs from the commit round", async ({ logger, processor }) => {
		const info = spy(logger, "info");

		await processor.commit(makeUnit(makeBlock(), { round: 2 }));

		info.calledWith("Committed block 3/2(1)/block-hash with 0 tx(s) (gasUsed=0)", "consensus");
	});

	it("#commit - should skip the api sync for the genesis block", async ({ apiSync, evm, processor }) => {
		const flush = spy(apiSync, "flush");
		const apiSyncOnCommit = spy(apiSync, "onCommit");
		const evmOnCommit = spy(evm, "onCommit");

		await processor.commit(makeUnit(makeBlock({ number: 0 })));

		evmOnCommit.calledOnce();
		flush.neverCalled();
		apiSyncOnCommit.neverCalled();
	});

	it("#commit - should commit without an api sync service", async ({ events, evm, processorWithoutApiSync }) => {
		const onCommit = spy(evm, "onCommit");
		const dispatch = spy(events, "dispatch");

		await processorWithoutApiSync.commit(makeUnit(makeBlock()));

		onCommit.calledOnce();
		dispatch.calledWith(Events.BlockEvent.Applied, { ...blockData, contractEvents: [] });
	});

	it("#commit - should aggregate the failures of the concurrent commit handlers", async ({
		apiSync,
		events,
		evmWorker,
		processor,
		txPoolWorker,
	}) => {
		const poolError = new Error("pool failed");
		const syncError = new Error("sync failed");
		stub(txPoolWorker, "onCommit").rejectedValue(poolError);
		stub(apiSync, "onCommit").rejectedValue(syncError);
		const evmWorkerOnCommit = spy(evmWorker, "onCommit");
		const dispatch = spy(events, "dispatch");

		let caught: unknown;
		try {
			await processor.commit(makeUnit(makeBlock()));
		} catch (error) {
			caught = error;
		}

		assert.instance(caught, AggregateError);
		assert.equal((caught as AggregateError).message, "one or more commit handlers failed");
		assert.length((caught as AggregateError).errors, 2);
		assert.is((caught as AggregateError).errors[0], poolError);
		assert.is((caught as AggregateError).errors[1], syncError);
		evmWorkerOnCommit.calledOnce();
		dispatch.neverCalled();
	});

	it("#commit - should stop at a failing sequential commit handler", async ({
		events,
		evm,
		processor,
		stateStore,
		txPoolWorker,
	}) => {
		stub(evm, "onCommit").rejectedValue(new Error("evm commit failed"));
		const stateStoreOnCommit = spy(stateStore, "onCommit");
		const txPoolOnCommit = spy(txPoolWorker, "onCommit");
		const dispatch = spy(events, "dispatch");

		await assert.rejects(() => processor.commit(makeUnit(makeBlock())), "evm commit failed");

		stateStoreOnCommit.neverCalled();
		txPoolOnCommit.neverCalled();
		dispatch.neverCalled();
	});

	it("#commit - should stay quiet while bootstrapping", async ({
		events,
		evm,
		logger,
		processor,
		roundCalculator,
		state,
	}) => {
		state.isBootstrap = () => true;
		roundCalculator.isNewRound = () => true;
		const onCommit = spy(evm, "onCommit");
		const dispatch = spy(events, "dispatch");
		const info = spy(logger, "info");
		const debug = spy(logger, "debug");
		const calculateRound = spy(roundCalculator, "calculateRound");

		await processor.commit(makeUnit(makeBlock({ transactions: [makeTransaction(1)], transactionsCount: 1 })));

		onCommit.calledOnce();
		dispatch.neverCalled();
		info.neverCalled();
		debug.neverCalled();
		calculateRound.neverCalled();
	});

	it("#commit - should log the start of a new validator round", async ({ logger, processor, roundCalculator }) => {
		roundCalculator.isNewRound = (height: number) => height === blockNumber + 1;
		const calculateRound = spy(roundCalculator, "calculateRound");
		const debug = spy(logger, "debug");

		await processor.commit(makeUnit(makeBlock()));

		calculateRound.calledWith(blockNumber + 1);
		debug.calledWith("Starting validator round 2 at block number 4 with 53 validators");
	});

	it("#commit - should not log a new validator round when the next block continues the round", async ({
		logger,
		processor,
		roundCalculator,
	}) => {
		const calculateRound = spy(roundCalculator, "calculateRound");
		const debug = spy(logger, "debug");

		await processor.commit(makeUnit(makeBlock()));

		calculateRound.neverCalled();
		debug.neverCalled();
	});
});
