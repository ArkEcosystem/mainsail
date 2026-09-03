import { Identifiers } from "@mainsail/constants";
import { Application } from "@mainsail/kernel";

import { describe } from "@mainsail/test-runner";
import { TransactionForger } from "./transaction-forger";

const makeTransaction = (index: number, overrides = {}) => ({
	data: "0xabcdef",
	from: `sender-${index}`,
	gasLimit: 21_000,
	gasPrice: 5,
	hash: `hash-${index}`,
	nonce: BigInt(index),
	senderLegacyAddress: undefined,
	senderPublicKey: `publicKey-${index}`,
	serialized: Buffer.from(`serialized-${index}`),
	to: "recipient",
	value: 0n,
	...overrides,
});

describe<{
	app: Application;
	cryptoConfiguration: any;
	evm: any;
	forger: TransactionForger;
	forgerConfig: any;
	genesisInfo: any;
	logger: any;
	milestone: any;
	roundCalculator: any;
	txPoolWorker: any;
}>("TransactionForger", ({ beforeEach, it, assert, spy, stub }) => {
	const commitKey = { blockNumber: 3n, round: 0n };
	const generatorAddress = "generatorAddress";
	const timestamp = 1_700_000_000;
	const prevrandao = Buffer.from("cc".repeat(32), "hex");
	const previousBlock = {
		hash: "parentHash",
		number: 2,
		randaoReveal: "ab".repeat(96),
		stateRoot: "parentStateRoot",
	};

	beforeEach((context) => {
		context.milestone = {
			block: { maxGasLimit: 100_000 },
			evmSpec: "Latest",
			reward: "2000000000",
			roundValidators: 53,
			timeouts: { blockPrepareTime: 4000 },
			validatorRegistrationFee: "250000000000000000000",
		};
		context.genesisInfo = { account: "0x0000000000000000000000000000000000000001" };
		context.forgerConfig = { txCollatorFactor: 0.75 };

		context.evm = {
			calculateRoundValidators: async () => {},
			dispose: async () => {},
			initializeGenesis: async () => {},
			logsBloom: async () => "logsBloom",
			prepareNextCommit: async () => {},
			process: async () => ({ receipt: { gasUsed: 21_000n } }),
			rollback: async () => {},
			snapshot: async () => {},
			stateRoot: async () => "stateRoot",
			updateRewardsAndVotes: async () => {},
			updateValidatorRegistrationFee: async () => {},
		};
		context.txPoolWorker = {
			getTransactions: async () => ({ remaining: 0, transactions: [] }),
			removeTransaction: async () => {},
		};
		context.logger = { info: () => {}, warn: () => {} };
		context.roundCalculator = { isNewRound: () => false };
		context.cryptoConfiguration = { getMilestone: () => context.milestone };

		const app = new Application();
		app.bind(Identifiers.ServiceProvider.Configuration)
			.toConstantValue({ getRequired: (key: string) => context.forgerConfig[key] })
			.whenTagged("plugin", "forger");
		app.bind(Identifiers.Cryptography.Configuration).toConstantValue(context.cryptoConfiguration);
		app.bind(Identifiers.Evm.Instance).toConstantValue(context.evm).whenTagged("instance", "validator");
		app.bind(Identifiers.Cryptography.Hash.Factory).toConstantValue({ keccak256: () => prevrandao });
		app.bind(Identifiers.State.Store).toConstantValue({ getLastBlock: () => previousBlock });
		app.bind(Identifiers.EvmConsensus.GenesisInfo).toConstantValue(context.genesisInfo);
		app.bind(Identifiers.BlockchainUtils.RoundCalculator).toConstantValue(context.roundCalculator);
		app.bind(Identifiers.Services.Log.Service).toConstantValue(context.logger);
		app.bind(Identifiers.TransactionPool.Worker).toConstantValue(context.txPoolWorker);
		app.bind(Identifiers.BlockchainUtils.FeeCalculator).toConstantValue({
			calculateConsumed: (gasPrice: number, gasUsed: bigint) => BigInt(gasPrice) * gasUsed,
		});
		app.bind(Identifiers.Cryptography.Transaction.Factory).toConstantValue({
			fromPoolData: async (data: any) => data,
		});

		context.app = app;
		context.forger = app.resolve(TransactionForger);
	});

	const stubPool = (txPoolWorker: any, transactions: unknown[]) =>
		stub(txPoolWorker, "getTransactions").resolvedValueSequence([
			{ remaining: 0, transactions },
			{ remaining: 0, transactions: [] },
		]);

	it("#initialize - should return the forger instance", ({ forger }) => {
		assert.is(forger.initialize(generatorAddress, timestamp, commitKey), forger);
	});

	it("#getTransactions - should prepare the evm and settle state for an empty pool", async ({
		evm,
		forger,
		genesisInfo,
	}) => {
		const initializeGenesis = spy(evm, "initializeGenesis");
		const prepareNextCommit = spy(evm, "prepareNextCommit");
		const updateRewardsAndVotes = spy(evm, "updateRewardsAndVotes");
		const logsBloom = spy(evm, "logsBloom");
		const stateRoot = spy(evm, "stateRoot");
		const dispose = spy(evm, "dispose");

		const result = await forger.initialize(generatorAddress, timestamp, commitKey).getTransactions();

		assert.equal(result, { fee: 0n, gasUsed: 0, logsBloom: "logsBloom", stateRoot: "stateRoot", transactions: [] });

		initializeGenesis.calledWith(genesisInfo);
		prepareNextCommit.calledWith({
			blockContext: {
				commitKey,
				gasLimit: 100_000n,
				prevrandao,
				timestamp: BigInt(timestamp),
				validatorAddress: generatorAddress,
			},
		});
		updateRewardsAndVotes.calledWith({
			blockReward: 2_000_000_000n,
			commitKey,
			specId: "Latest",
			timestamp: BigInt(timestamp),
			validatorAddress: generatorAddress,
		});
		logsBloom.calledWith(commitKey);
		stateRoot.calledWith(commitKey, previousBlock.stateRoot);
		dispose.calledOnce();
	});

	it("#getTransactions - should include pool transactions and accumulate gas and fees", async ({
		evm,
		forger,
		txPoolWorker,
	}) => {
		const transaction1 = makeTransaction(1);
		const transaction2 = makeTransaction(2);
		stubPool(txPoolWorker, [transaction1, transaction2]);

		const process = stub(evm, "process").resolvedValueSequence([
			{ receipt: { gasUsed: 21_000n } },
			{ receipt: { gasUsed: 30_000n } },
		]);

		const result = await forger.initialize(generatorAddress, timestamp, commitKey).getTransactions();

		assert.equal(result.transactions, [transaction1, transaction2]);
		assert.equal(result.gasUsed, 51_000);
		assert.equal(result.fee, 255_000n);

		process.calledTimes(2);
		process.calledNthWith(0, {
			commitKey,
			data: Buffer.from("abcdef", "hex"),
			from: "sender-1",
			gasLimit: 21_000n,
			gasPrice: 5n,
			legacyAddress: undefined,
			nonce: 1n,
			specId: "Latest",
			to: "recipient",
			txHash: "hash-1",
			value: 0n,
		});
	});

	it("#getTransactions - should stop collating when the time budget is exhausted", async ({
		evm,
		forger,
		forgerConfig,
		txPoolWorker,
	}) => {
		forgerConfig.txCollatorFactor = -1; // places the deadline in the past

		stubPool(txPoolWorker, [makeTransaction(1)]);
		const process = spy(evm, "process");

		const result = await forger.initialize(generatorAddress, timestamp, commitKey).getTransactions();

		assert.empty(result.transactions);
		process.neverCalled();
	});

	it("#getTransactions - should stop collating when the remaining block space cannot fit another transaction", async ({
		evm,
		forger,
		milestone,
		txPoolWorker,
	}) => {
		milestone.block.maxGasLimit = 30_000;

		const transaction1 = makeTransaction(1);
		const transaction2 = makeTransaction(2);
		stubPool(txPoolWorker, [transaction1, transaction2]);

		const process = stub(evm, "process").resolvedValue({ receipt: { gasUsed: 21_000n } });
		const snapshot = spy(evm, "snapshot");

		const result = await forger.initialize(generatorAddress, timestamp, commitKey).getTransactions();

		assert.equal(result.transactions, [transaction1]);
		assert.equal(result.gasUsed, 21_000);
		process.calledOnce();
		snapshot.neverCalled();
	});

	it("#getTransactions - should remove a failing transaction from the pool, skip subsequent transactions from the same sender and continue with other senders", async ({
		evm,
		forger,
		logger,
		txPoolWorker,
	}) => {
		const transaction1 = makeTransaction(1);
		const transaction2 = makeTransaction(2, { senderPublicKey: "publicKey-1" });
		const transaction3 = makeTransaction(3);
		stubPool(txPoolWorker, [transaction1, transaction2, transaction3]);

		const process = stub(evm, "process").resolvedValue({ receipt: { gasUsed: 21_000n } });
		process.rejectedValueNth(0, new Error("execution failed"));
		const removeTransaction = spy(txPoolWorker, "removeTransaction");
		const warn = spy(logger, "warn");

		const result = await forger.initialize(generatorAddress, timestamp, commitKey).getTransactions();

		assert.equal(result.transactions, [transaction3]);
		assert.equal(result.gasUsed, 21_000);
		process.calledTimes(2);
		removeTransaction.calledOnce();
		removeTransaction.calledWith("sender-1", "hash-1");
		warn.calledWith("tx hash-1 from sender-1 failed to collate: execution failed");
	});

	it("#getTransactions - should optimistically execute a transaction exceeding the remaining gas and keep it when it fits", async ({
		evm,
		forger,
		milestone,
		txPoolWorker,
	}) => {
		milestone.block.maxGasLimit = 50_000;

		const transaction = makeTransaction(1, { gasLimit: 100_000 });
		stubPool(txPoolWorker, [transaction]);

		stub(evm, "process").resolvedValue({ receipt: { gasUsed: 30_000n } });
		const snapshot = spy(evm, "snapshot");
		const rollback = spy(evm, "rollback");

		const result = await forger.initialize(generatorAddress, timestamp, commitKey).getTransactions();

		assert.equal(result.transactions, [transaction]);
		assert.equal(result.gasUsed, 30_000);
		assert.equal(result.fee, 150_000n);
		snapshot.calledOnce();
		snapshot.calledWith(commitKey);
		rollback.neverCalled();
	});

	it("#getTransactions - should keep an optimistic execution that exactly fills the remaining block space", async ({
		evm,
		forger,
		milestone,
		txPoolWorker,
	}) => {
		milestone.block.maxGasLimit = 50_000;

		const transaction = makeTransaction(1, { gasLimit: 100_000 });
		stubPool(txPoolWorker, [transaction]);

		stub(evm, "process").resolvedValue({ receipt: { gasUsed: 50_000n } });
		const snapshot = spy(evm, "snapshot");
		const rollback = spy(evm, "rollback");

		const result = await forger.initialize(generatorAddress, timestamp, commitKey).getTransactions();

		assert.equal(result.transactions, [transaction]);
		assert.equal(result.gasUsed, 50_000);
		snapshot.calledOnce();
		rollback.neverCalled();
	});

	it("#getTransactions - should fill the block up to the exact gas limit before stopping", async ({
		evm,
		forger,
		milestone,
		txPoolWorker,
	}) => {
		// Two exact-fit transfers: the second is only processed if the 21000-gas floor check is strict.
		milestone.block.maxGasLimit = 42_000;

		const transaction1 = makeTransaction(1);
		const transaction2 = makeTransaction(2);
		stubPool(txPoolWorker, [transaction1, transaction2]);

		const process = stub(evm, "process").resolvedValue({ receipt: { gasUsed: 21_000n } });
		const snapshot = spy(evm, "snapshot");

		const result = await forger.initialize(generatorAddress, timestamp, commitKey).getTransactions();

		assert.equal(result.transactions, [transaction1, transaction2]);
		assert.equal(result.gasUsed, 42_000);
		process.calledTimes(2);
		snapshot.neverCalled();
	});

	it("#getTransactions - should continue collating after a failed optimistic execution is rolled back", async ({
		evm,
		forger,
		logger,
		milestone,
		txPoolWorker,
	}) => {
		milestone.block.maxGasLimit = 50_000;

		const transaction1 = makeTransaction(1, { gasLimit: 100_000 });
		const transaction2 = makeTransaction(2, { gasLimit: 100_000 });
		stubPool(txPoolWorker, [transaction1, transaction2]);

		const process = stub(evm, "process").resolvedValue({ receipt: { gasUsed: 30_000n } });
		process.rejectedValueNth(0, new Error("execution failed"));
		const snapshot = spy(evm, "snapshot");
		const rollback = spy(evm, "rollback");
		const removeTransaction = spy(txPoolWorker, "removeTransaction");
		const warn = spy(logger, "warn");

		const result = await forger.initialize(generatorAddress, timestamp, commitKey).getTransactions();

		assert.equal(result.transactions, [transaction2]);
		assert.equal(result.gasUsed, 30_000);
		assert.equal(result.fee, 150_000n);
		snapshot.calledTimes(2);
		rollback.calledOnce();
		rollback.calledWith(commitKey);
		removeTransaction.calledOnce();
		removeTransaction.calledWith("sender-1", "hash-1");
		warn.calledOnce();
		warn.calledWith("tx hash-1 from sender-1 failed to collate: execution failed");
	});

	it("#getTransactions - should roll back an optimistic execution when the consumed gas exceeds the block space", async ({
		evm,
		forger,
		logger,
		milestone,
		txPoolWorker,
	}) => {
		milestone.block.maxGasLimit = 50_000;

		const transaction1 = makeTransaction(1, { gasLimit: 100_000 });
		const transaction2 = makeTransaction(2);
		stubPool(txPoolWorker, [transaction1, transaction2]);

		const process = stub(evm, "process").resolvedValue({ receipt: { gasUsed: 60_000n } });
		const snapshot = spy(evm, "snapshot");
		const rollback = spy(evm, "rollback");
		const removeTransaction = spy(txPoolWorker, "removeTransaction");
		const warn = spy(logger, "warn");

		const result = await forger.initialize(generatorAddress, timestamp, commitKey).getTransactions();

		assert.empty(result.transactions);
		assert.equal(result.gasUsed, 0);
		assert.equal(result.fee, 0n);
		snapshot.calledOnce();
		rollback.calledOnce();
		rollback.calledWith(commitKey);
		warn.calledWith(
			"Skipping tx hash-1 due to insufficient block space (tx.gasUsed=60000 gasLeft=50000 optimistic=true)",
		);
		removeTransaction.neverCalled(); // the transaction was skipped, not failed
		process.calledOnce();
	});

	it("#getTransactions - should treat a non-optimistic execution exceeding the block space as a failed transaction", async ({
		evm,
		forger,
		logger,
		txPoolWorker,
	}) => {
		const transaction = makeTransaction(1, { gasLimit: 90_000 });
		stubPool(txPoolWorker, [transaction]);

		stub(evm, "process").resolvedValue({ receipt: { gasUsed: 110_000n } });
		const rollback = spy(evm, "rollback");
		const removeTransaction = spy(txPoolWorker, "removeTransaction");
		const warn = spy(logger, "warn");

		const result = await forger.initialize(generatorAddress, timestamp, commitKey).getTransactions();

		assert.empty(result.transactions);
		rollback.neverCalled();
		removeTransaction.calledWith("sender-1", "hash-1");
		warn.calledNthWith(
			0,
			"Skipping tx hash-1 due to insufficient block space (tx.gasUsed=110000 gasLeft=100000 optimistic=false)",
		);
		warn.calledNthWith(
			1,
			"tx hash-1 from sender-1 failed to collate: Non-optimistic transaction processing requires more gas than remaining block space (tx.gasUsed=110000 gasLeft=100000)",
		);
	});

	it("#getTransactions - should log and continue when the rollback of a failed optimistic execution fails", async ({
		evm,
		forger,
		logger,
		milestone,
		txPoolWorker,
	}) => {
		milestone.block.maxGasLimit = 50_000;

		const transaction = makeTransaction(1, { gasLimit: 100_000 });
		stubPool(txPoolWorker, [transaction]);

		stub(evm, "process").rejectedValue(new Error("execution failed"));
		const rollback = stub(evm, "rollback").rejectedValue(new Error("rollback failed"));
		const removeTransaction = spy(txPoolWorker, "removeTransaction");
		const warn = spy(logger, "warn");
		const dispose = spy(evm, "dispose");

		const result = await forger.initialize(generatorAddress, timestamp, commitKey).getTransactions();

		assert.empty(result.transactions);
		rollback.calledOnce();
		rollback.calledWith(commitKey);
		warn.calledNthWith(0, "rollback failed after failed tx hash-1: rollback failed");
		warn.calledNthWith(1, "tx hash-1 from sender-1 failed to collate: execution failed");
		removeTransaction.calledOnce();
		dispose.calledOnce();
	});

	it("#getTransactions - should update the registration fee and round validators using the milestone at the upcoming height when the next block starts a new round", async ({
		cryptoConfiguration,
		evm,
		forger,
		milestone,
		roundCalculator,
	}) => {
		// The updates must read the milestone taking effect at the new round, not the current one.
		const nextMilestone = {
			evmSpec: "Shanghai",
			roundValidators: 60,
			validatorRegistrationFee: "500000000000000000000",
		};
		stub(cryptoConfiguration, "getMilestone").callsFake((height?: number) =>
			height === previousBlock.number + 2 ? nextMilestone : milestone,
		);
		const isNewRound = stub(roundCalculator, "isNewRound").returnValue(true);
		const updateValidatorRegistrationFee = spy(evm, "updateValidatorRegistrationFee");
		const calculateRoundValidators = spy(evm, "calculateRoundValidators");

		await forger.initialize(generatorAddress, timestamp, commitKey).getTransactions();

		isNewRound.calledWith(previousBlock.number + 2);
		updateValidatorRegistrationFee.calledWith({
			commitKey,
			fee: 500_000_000_000_000_000_000n,
			specId: "Shanghai",
			timestamp: BigInt(timestamp),
			validatorAddress: generatorAddress,
		});
		calculateRoundValidators.calledWith({
			commitKey,
			roundValidators: 60n,
			specId: "Shanghai",
			timestamp: BigInt(timestamp),
			validatorAddress: generatorAddress,
		});
	});

	it("#getTransactions - should not update the registration fee or round validators mid-round", async ({
		evm,
		forger,
	}) => {
		const updateValidatorRegistrationFee = spy(evm, "updateValidatorRegistrationFee");
		const calculateRoundValidators = spy(evm, "calculateRoundValidators");

		await forger.initialize(generatorAddress, timestamp, commitKey).getTransactions();

		updateValidatorRegistrationFee.neverCalled();
		calculateRoundValidators.neverCalled();
	});

	it("#getTransactions - should settle rewards, fees and round validators before computing the logs bloom and state root", async ({
		evm,
		forger,
		roundCalculator,
		txPoolWorker,
	}) => {
		stub(roundCalculator, "isNewRound").returnValue(true);
		stubPool(txPoolWorker, [makeTransaction(1)]);

		const calls: string[] = [];
		const track = (method: string, value?: unknown) =>
			stub(evm, method).callsFake(async () => {
				calls.push(method);
				return value;
			});

		track("process", { receipt: { gasUsed: 21_000n } });
		track("updateRewardsAndVotes");
		track("updateValidatorRegistrationFee");
		track("calculateRoundValidators");
		track("logsBloom", "logsBloom");
		track("stateRoot", "stateRoot");

		await forger.initialize(generatorAddress, timestamp, commitKey).getTransactions();

		assert.equal(calls, [
			"process",
			"updateRewardsAndVotes",
			"updateValidatorRegistrationFee",
			"calculateRoundValidators",
			"logsBloom",
			"stateRoot",
		]);
	});

	it("#getTransactions - should dispose the evm when preparation fails", async ({ evm, forger }) => {
		stub(evm, "prepareNextCommit").rejectedValue(new Error("prepare failed"));
		const dispose = spy(evm, "dispose");

		await assert.rejects(
			() => forger.initialize(generatorAddress, timestamp, commitKey).getTransactions(),
			"prepare failed",
		);
		dispose.calledOnce();
	});
});
