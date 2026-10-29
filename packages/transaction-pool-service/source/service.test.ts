import { EnvironmentVariables, Events, Identifiers } from "@mainsail/constants";
import {
	PoolError,
	TransactionAlreadyInPoolError,
	TransactionFeeTooLowError,
	TransactionPoolFullError,
} from "@mainsail/exceptions";
import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";

import { Service } from "./service";

const alice = {
	address: "0x75545540230d5c3BEf023202d23CB74cFA723376",
	publicKey: "03e0812731df97edc9990d55d919b33294f131b5fd44996266859cfd2514514121",
};
const bob = {
	address: "0xbbe7B35057F3431E001d2b96817e3061B59849c9",
	publicKey: "02c9b561bc6daa0a89343237e92f4ac75022f260f6371c22a6bbe35dfe839938ec",
};

const makeTransaction = (sender: typeof alice, nonce: bigint, gasPrice = 5): any => {
	const hash = `${sender.address}-${nonce}`;

	return {
		from: sender.address,
		gasPrice,
		hash,
		nonce,
		senderPublicKey: sender.publicKey,
		serialized: Buffer.from(hash),
		toData: () => ({ hash }),
	};
};

const toStoredTransaction = (transaction: any, blockNumber: number) => ({
	blockNumber,
	hash: transaction.hash,
	senderPublicKey: transaction.senderPublicKey,
	serialized: transaction.serialized,
});

const nextTick = async () => new Promise((resolve) => setImmediate(resolve));

const resetVariables = [EnvironmentVariables.MAINSAIL_RESET_DATABASE, EnvironmentVariables.MAINSAIL_RESET_POOL];

describe<{
	app: Application;
	service: Service;
	config: Record<string, number>;
	environment: Record<string, string | undefined>;
	listeners: Record<string, any>;
	poolTransactions: any[];
	broadcaster: any;
	events: any;
	logger: any;
	mempool: any;
	poolQuery: any;
	stateStore: any;
	storage: any;
	transactionFactory: any;
}>("Service", ({ it, beforeEach, afterEach, assert, each, stub, spy }) => {
	beforeEach((context) => {
		context.environment = {};
		for (const name of resetVariables) {
			context.environment[name] = process.env[name];
			delete process.env[name];
		}

		context.poolTransactions = [];

		context.config = {
			maxTransactionAge: 2700,
			maxTransactionsInPool: 15_000,
			maxTransactionsPerRequest: 40,
			rebroadcastCooldownBlocks: 1,
			rebroadcastThreshold: 60,
		};

		context.broadcaster = {
			broadcastTransactions: async () => {},
		};

		context.listeners = {};
		context.events = {
			dispatch: async () => {},
			forget: () => {},
			listen: (name: string, listener: any) => {
				context.listeners[name] = listener;
				return () => {};
			},
		};

		context.logger = {
			debug: () => {},
			error: () => {},
			info: () => {},
			warn: () => {},
		};

		context.mempool = {
			addTransaction: async (transaction: any) => {
				context.poolTransactions.push(transaction);
			},
			flush: () => {},
			getSize: () => context.poolTransactions.length,
			reAddTransactions: async () => [],
			removeTransaction: async (_address: string, hash: string) => {
				const index = context.poolTransactions.findIndex((transaction) => transaction.hash === hash);

				return index === -1 ? [] : context.poolTransactions.splice(index, 1);
			},
		};

		context.poolQuery = {
			getFromHighestPriority: () => ({ all: async () => context.poolTransactions }),
			getFromLowestPriority: () => ({ first: async () => context.poolTransactions.at(-1) }),
		};

		context.stateStore = {
			blockNumber: 100,
			getBlockNumber: () => context.stateStore.blockNumber,
		};

		context.storage = {
			addTransaction: () => {},
			flush: () => {},
			getAllTransactions: () => [],
			getOldTransactions: () => [],
			hasTransaction: () => false,
			removeTransaction: () => {},
		};

		context.transactionFactory = {
			fromBytes: async () => {
				throw new Error("not implemented");
			},
		};

		context.app = new Application();
		context.app.bind(Identifiers.ServiceProvider.Configuration).toConstantValue({
			getRequired: (key: string) => context.config[key],
		});
		context.app.bind(Identifiers.Cryptography.Identity.Address.Factory).toConstantValue({
			fromPublicKey: async (publicKey: string) =>
				[alice, bob].find((sender) => sender.publicKey === publicKey)?.address,
		});
		context.app.bind(Identifiers.State.Store).toConstantValue(context.stateStore);
		context.app.bind(Identifiers.TransactionPool.Broadcaster).toConstantValue(context.broadcaster);
		context.app.bind(Identifiers.Cryptography.Configuration).toConstantValue({
			getMilestone: () => ({ block: { maxGasLimit: 10_000_000 } }),
		});
		context.app.bind(Identifiers.TransactionPool.Storage).toConstantValue(context.storage);
		context.app.bind(Identifiers.TransactionPool.Mempool).toConstantValue(context.mempool);
		context.app.bind(Identifiers.TransactionPool.Query).toConstantValue(context.poolQuery);
		context.app.bind(Identifiers.Services.EventDispatcher.Service).toConstantValue(context.events);
		context.app.bind(Identifiers.Services.Log.Service).toConstantValue(context.logger);
		context.app.bind(Identifiers.Cryptography.Transaction.Factory).toConstantValue(context.transactionFactory);

		context.service = context.app.resolve(Service);
	});

	afterEach(({ environment }) => {
		for (const name of resetVariables) {
			if (environment[name] === undefined) {
				delete process.env[name];
			} else {
				process.env[name] = environment[name];
			}
		}
	});

	it("commit - should remove re-added transactions from storage and dispatch events", async ({
		service,
		mempool,
		storage,
		events,
	}) => {
		const transaction = makeTransaction(alice, 0n);
		stub(mempool, "reAddTransactions").resolvedValue([transaction]);
		const removeTransaction = spy(storage, "removeTransaction");
		const dispatch = spy(events, "dispatch");

		await service.commit([transaction.from], 0, true);

		removeTransaction.calledWith(transaction.hash);
		dispatch.calledWith(Events.TransactionEvent.RemovedFromPool, transaction.toData());
	});

	it("commit - should look up transactions older than maxTransactionAge", async ({ service, config, storage }) => {
		config.maxTransactionAge = 10;
		const getOldTransactions = spy(storage, "getOldTransactions");

		await service.commit([], 0, true);

		getOldTransactions.calledOnce();
		getOldTransactions.calledWith(90);
	});

	it("commit - should expire old transactions together with the later transactions of their sender", async ({
		service,
		mempool,
		storage,
		events,
	}) => {
		const [oldTransaction, laterTransaction] = [makeTransaction(alice, 0n), makeTransaction(alice, 1n)];
		stub(storage, "getOldTransactions").returnValue([toStoredTransaction(oldTransaction, 1)]);
		const removeFromMempool = stub(mempool, "removeTransaction").resolvedValue([oldTransaction, laterTransaction]);
		const removeFromStorage = spy(storage, "removeTransaction");
		const dispatch = spy(events, "dispatch");

		await service.commit([], 0, true);

		removeFromMempool.calledOnce();
		removeFromMempool.calledWith(alice.address, oldTransaction.hash);
		removeFromStorage.calledTimes(2);
		removeFromStorage.calledWith(oldTransaction.hash);
		removeFromStorage.calledWith(laterTransaction.hash);
		dispatch.calledTimes(2);
		dispatch.calledWith(Events.TransactionEvent.Expired, oldTransaction.toData());
		dispatch.calledWith(Events.TransactionEvent.Expired, laterTransaction.toData());
	});

	it("commit - should remove an expired transaction from storage even when it is no longer in the mempool", async ({
		service,
		storage,
		events,
	}) => {
		const transaction = makeTransaction(alice, 0n);
		stub(storage, "getOldTransactions").returnValue([toStoredTransaction(transaction, 1)]);
		const removeTransaction = spy(storage, "removeTransaction");
		const dispatch = spy(events, "dispatch");

		await service.commit([], 0, true);

		removeTransaction.calledWith(transaction.hash);
		dispatch.neverCalled();
	});

	it("commit - should evict the lowest priority transactions until the pool fits maxTransactionsInPool", async ({
		service,
		config,
		poolTransactions,
		storage,
		events,
	}) => {
		config.maxTransactionsInPool = 1;
		const [first, second, third] = [
			makeTransaction(alice, 0n),
			makeTransaction(bob, 0n),
			makeTransaction(alice, 1n),
		];
		poolTransactions.push(first, second, third);
		const removeFromStorage = spy(storage, "removeTransaction");
		const dispatch = spy(events, "dispatch");

		await service.commit([], 0, true);

		assert.equal(poolTransactions, [first]);
		removeFromStorage.calledTimes(2);
		removeFromStorage.calledNthWith(0, third.hash);
		removeFromStorage.calledNthWith(1, second.hash);
		dispatch.calledTimes(2);
		dispatch.calledWith(Events.TransactionEvent.RemovedFromPool, third.toData());
		dispatch.calledWith(Events.TransactionEvent.RemovedFromPool, second.toData());
	});

	it("commit - should rebroadcast pool transactions when the block is not full", async ({
		service,
		broadcaster,
		poolTransactions,
	}) => {
		poolTransactions.push(makeTransaction(alice, 0n), makeTransaction(bob, 0n));
		const broadcastTransactions = spy(broadcaster, "broadcastTransactions");

		await service.commit([], 0, false);

		broadcastTransactions.calledOnce();
		broadcastTransactions.calledWith(poolTransactions);
	});

	it("commit - should not rebroadcast within the cooldown window", async ({
		service,
		broadcaster,
		poolTransactions,
		stateStore,
	}) => {
		poolTransactions.push(makeTransaction(alice, 0n));
		const broadcastTransactions = spy(broadcaster, "broadcastTransactions");

		await service.commit([], 0, false);
		broadcastTransactions.calledOnce();

		// The cooldown is blockNumber + 1 (rebroadcastCooldownBlocks: 1), so the next block skips it.
		stateStore.blockNumber++;
		await service.commit([], 0, false);
		broadcastTransactions.calledOnce();
	});

	it("commit - should rebroadcast again after the cooldown window has passed", async ({
		service,
		broadcaster,
		poolTransactions,
		stateStore,
	}) => {
		poolTransactions.push(makeTransaction(alice, 0n));
		const broadcastTransactions = spy(broadcaster, "broadcastTransactions");

		await service.commit([], 0, false);
		broadcastTransactions.calledOnce();

		stateStore.blockNumber += 2;
		await service.commit([], 0, false);
		broadcastTransactions.calledTimes(2);
	});

	it("commit - should not rebroadcast when syncing", async ({ service, broadcaster, poolTransactions }) => {
		poolTransactions.push(makeTransaction(alice, 0n));
		const broadcastTransactions = spy(broadcaster, "broadcastTransactions");

		await service.commit([], 0, true);

		broadcastTransactions.neverCalled();
	});

	it("commit - should not rebroadcast when the block is sufficiently full", async ({
		service,
		broadcaster,
		poolTransactions,
	}) => {
		poolTransactions.push(makeTransaction(alice, 0n));
		const broadcastTransactions = spy(broadcaster, "broadcastTransactions");

		// rebroadcastThreshold is 60% of maxGasLimit 10_000_000.
		await service.commit([], 6_000_001, false);

		broadcastTransactions.neverCalled();
	});

	it("commit - should limit rebroadcast to maxTransactionsPerRequest", async ({
		service,
		config,
		broadcaster,
		poolTransactions,
	}) => {
		config.maxTransactionsPerRequest = 2;
		poolTransactions.push(makeTransaction(alice, 0n), makeTransaction(alice, 1n), makeTransaction(bob, 0n));
		const broadcastTransactions = spy(broadcaster, "broadcastTransactions");

		await service.commit([], 0, false);

		broadcastTransactions.calledWith([poolTransactions[0], poolTransactions[1]]);
	});

	it("commit - should log a failed rebroadcast", async ({ service, broadcaster, logger, poolTransactions }) => {
		poolTransactions.push(makeTransaction(alice, 0n));
		const error = new Error("broadcast failed");
		stub(broadcaster, "broadcastTransactions").rejectedValue(error);
		const logError = spy(logger, "error");

		await service.commit([], 0, false);
		await nextTick();

		logError.calledOnce();
		logError.calledWith(error.stack);
	});

	it("commit - should do nothing when disposed", async ({ service, broadcaster, poolTransactions }) => {
		poolTransactions.push(makeTransaction(alice, 0n));
		const broadcastTransactions = spy(broadcaster, "broadcastTransactions");

		service.dispose();
		await service.commit([], 0, false);

		broadcastTransactions.neverCalled();
	});

	it("addTransaction - should store the transaction with the current block number and add it to the mempool", async ({
		service,
		poolTransactions,
		storage,
	}) => {
		const addToStorage = spy(storage, "addTransaction");
		const transaction = makeTransaction(alice, 0n);

		await service.addTransaction(transaction);

		addToStorage.calledOnce();
		addToStorage.calledWith({
			blockNumber: 100,
			hash: transaction.hash,
			senderPublicKey: alice.publicKey,
			serialized: transaction.serialized,
		});
		assert.equal(poolTransactions, [transaction]);
	});

	it("addTransaction - should dispatch AddedToPool with the transaction data", async ({ service, events }) => {
		const transaction = makeTransaction(alice, 0n);
		const dispatch = spy(events, "dispatch");

		await service.addTransaction(transaction);

		dispatch.calledWith(Events.TransactionEvent.AddedToPool, transaction.toData());
	});

	it("addTransaction - should reject a transaction that is already stored without touching the stored one", async ({
		service,
		mempool,
		storage,
		events,
	}) => {
		stub(storage, "hasTransaction").returnValue(true);
		const addToStorage = spy(storage, "addTransaction");
		const removeFromStorage = spy(storage, "removeTransaction");
		const addToMempool = spy(mempool, "addTransaction");
		const dispatch = spy(events, "dispatch");
		const transaction = makeTransaction(alice, 0n);

		await assert.rejects(() => service.addTransaction(transaction), new TransactionAlreadyInPoolError(transaction));

		addToStorage.neverCalled();
		removeFromStorage.neverCalled();
		addToMempool.neverCalled();
		dispatch.neverCalled();
	});

	it("addTransaction - should remove the transaction from storage and dispatch RejectedByPool when the pool rejects", async ({
		service,
		mempool,
		storage,
		events,
	}) => {
		const transaction = makeTransaction(alice, 0n);
		stub(mempool, "addTransaction").rejectedValue(new Error("rejected"));
		const removeFromStorage = spy(storage, "removeTransaction");
		const dispatch = spy(events, "dispatch");

		await assert.rejects(() => service.addTransaction(transaction));

		removeFromStorage.calledOnce();
		removeFromStorage.calledWith(transaction.hash);
		dispatch.calledOnce();
		dispatch.calledWith(Events.TransactionEvent.RejectedByPool, transaction.toData());
	});

	it("addTransaction - should rethrow an unexpected rejection as a PoolError", async ({ service, mempool }) => {
		stub(mempool, "addTransaction").rejectedValue(new Error("rejected"));

		const error = await service.addTransaction(makeTransaction(alice, 0n)).catch((error) => error);

		assert.instance(error, PoolError);
		assert.equal(error.type, "ERR_OTHER");
		assert.equal(error.message, "rejected");
	});

	it("addTransaction - should rethrow a PoolError unchanged", async ({ service, mempool }) => {
		const transaction = makeTransaction(alice, 0n);
		const poolError = new TransactionFeeTooLowError(transaction);
		stub(mempool, "addTransaction").rejectedValue(poolError);

		const error = await service.addTransaction(transaction).catch((error) => error);

		assert.is(error, poolError);
	});

	it("addTransaction - should reject a transaction that does not outbid the lowest priority one in a full pool", async ({
		service,
		config,
		poolTransactions,
		storage,
		events,
	}) => {
		config.maxTransactionsInPool = 1;
		const lowest = makeTransaction(bob, 0n, 5);
		poolTransactions.push(lowest);
		const removeFromStorage = spy(storage, "removeTransaction");
		const dispatch = spy(events, "dispatch");
		const transaction = makeTransaction(alice, 0n, 5);

		await assert.rejects(() => service.addTransaction(transaction), new TransactionPoolFullError(transaction, 5));

		assert.equal(poolTransactions, [lowest]);
		removeFromStorage.calledOnce();
		removeFromStorage.calledWith(transaction.hash);
		dispatch.calledOnce();
		dispatch.calledWith(Events.TransactionEvent.RejectedByPool, transaction.toData());
	});

	it("addTransaction - should evict the lowest priority transaction of a full pool for one that outbids it", async ({
		service,
		config,
		mempool,
		poolTransactions,
		storage,
		events,
	}) => {
		config.maxTransactionsInPool = 1;
		const lowest = makeTransaction(bob, 0n, 5);
		poolTransactions.push(lowest);
		const removeFromMempool = spy(mempool, "removeTransaction");
		const removeFromStorage = spy(storage, "removeTransaction");
		const dispatch = spy(events, "dispatch");
		const transaction = makeTransaction(alice, 0n, 6);

		await service.addTransaction(transaction);

		assert.equal(poolTransactions, [transaction]);
		removeFromMempool.calledOnce();
		removeFromMempool.calledWith(bob.address, lowest.hash);
		removeFromStorage.calledOnce();
		removeFromStorage.calledWith(lowest.hash);
		dispatch.calledWith(Events.TransactionEvent.RemovedFromPool, lowest.toData());
		dispatch.calledWith(Events.TransactionEvent.AddedToPool, transaction.toData());
	});

	it("addTransaction - should hold back rebroadcast of a just-added transaction until the next block", async ({
		service,
		broadcaster,
		stateStore,
	}) => {
		const broadcastTransactions = spy(broadcaster, "broadcastTransactions");

		await service.addTransaction(makeTransaction(alice, 0n));

		// Still within the same block as the add: the add-time cooldown suppresses it.
		await service.commit([], 0, false);
		broadcastTransactions.neverCalled();

		stateStore.blockNumber++;
		await service.commit([], 0, false);
		broadcastTransactions.calledOnce();
	});

	it("addTransaction - should do nothing when disposed", async ({ service, poolTransactions, storage }) => {
		const addToStorage = spy(storage, "addTransaction");

		service.dispose();
		await service.addTransaction(makeTransaction(alice, 0n));

		addToStorage.neverCalled();
		assert.equal(poolTransactions, []);
	});

	it("reAddTransactions - should flush the mempool before re-adding stored transactions", async ({
		service,
		mempool,
		storage,
		transactionFactory,
	}) => {
		const transaction = makeTransaction(alice, 0n);
		stub(storage, "getAllTransactions").returnValue([toStoredTransaction(transaction, 99)]);
		stub(transactionFactory, "fromBytes").resolvedValue(transaction);
		const calls: string[] = [];
		stub(mempool, "flush").callsFake(() => calls.push("flush"));
		stub(mempool, "addTransaction").callsFake(async () => calls.push("add"));

		await service.reAddTransactions();

		assert.equal(calls, ["flush", "add"]);
	});

	it("reAddTransactions - should dispatch AddedToPool with the transaction data for re-added transactions", async ({
		service,
		storage,
		transactionFactory,
		events,
	}) => {
		const transaction = makeTransaction(alice, 0n);
		stub(storage, "getAllTransactions").returnValue([toStoredTransaction(transaction, 99)]);
		stub(transactionFactory, "fromBytes").resolvedValue(transaction);
		const dispatch = spy(events, "dispatch");

		await service.reAddTransactions();

		dispatch.calledWith(Events.TransactionEvent.AddedToPool, transaction.toData());
	});

	it("reAddTransactions - should only re-add transactions stored after the expiry block", async ({
		service,
		config,
		poolTransactions,
		storage,
		transactionFactory,
	}) => {
		config.maxTransactionAge = 10;
		const [expiredTransaction, storedTransaction] = [makeTransaction(alice, 0n), makeTransaction(alice, 1n)];
		// At block 100 everything stored at block 90 or earlier has expired.
		stub(storage, "getAllTransactions").returnValue([
			toStoredTransaction(expiredTransaction, 90),
			toStoredTransaction(storedTransaction, 91),
		]);
		const fromBytes = stub(transactionFactory, "fromBytes").resolvedValue(storedTransaction);
		const removeFromStorage = spy(storage, "removeTransaction");

		await service.reAddTransactions();

		fromBytes.calledOnce();
		fromBytes.calledWith(storedTransaction.serialized);
		assert.equal(poolTransactions, [storedTransaction]);
		removeFromStorage.calledOnce();
		removeFromStorage.calledWith(expiredTransaction.hash);
	});

	it("reAddTransactions - should remove a stored transaction from storage when the mempool rejects it", async ({
		service,
		mempool,
		storage,
		transactionFactory,
	}) => {
		const transaction = makeTransaction(alice, 0n);
		stub(storage, "getAllTransactions").returnValue([toStoredTransaction(transaction, 99)]);
		stub(transactionFactory, "fromBytes").resolvedValue(transaction);
		stub(mempool, "addTransaction").rejectedValue(new Error("invalid"));
		const removeFromStorage = spy(storage, "removeTransaction");

		await service.reAddTransactions();

		removeFromStorage.calledOnce();
		removeFromStorage.calledWith(transaction.hash);
	});

	it("reAddTransactions - should clear cooldowns of transactions that are not re-added", async ({
		service,
		config,
		broadcaster,
		poolTransactions,
		stateStore,
		storage,
	}) => {
		config.maxTransactionAge = 10;
		const [expiredTransaction, failingTransaction] = [makeTransaction(alice, 0n), makeTransaction(bob, 0n)];
		poolTransactions.push(expiredTransaction, failingTransaction);
		const broadcastTransactions = spy(broadcaster, "broadcastTransactions");

		await service.commit([], 0, false);
		broadcastTransactions.calledOnce();

		// One stored transaction is expired, the other fails re-adding (factory throws).
		stub(storage, "getAllTransactions").returnValue([
			toStoredTransaction(expiredTransaction, 80),
			toStoredTransaction(failingTransaction, 95),
		]);
		await service.reAddTransactions();

		// Without the cooldown cleanup the pending cooldowns (blockNumber + 1) would suppress both.
		stateStore.blockNumber++;
		await service.commit([], 0, false);
		broadcastTransactions.calledTimes(2);
		broadcastTransactions.calledWith([expiredTransaction, failingTransaction]);
	});

	it("reAddTransactions - should do nothing when disposed", async ({ service, mempool, storage }) => {
		const mempoolFlush = spy(mempool, "flush");
		const getAllTransactions = spy(storage, "getAllTransactions");

		service.dispose();
		await service.reAddTransactions();

		mempoolFlush.neverCalled();
		getAllTransactions.neverCalled();
	});

	it("flush - should flush mempool and storage and clear the cooldowns of the flushed transactions", async ({
		service,
		broadcaster,
		mempool,
		poolTransactions,
		stateStore,
		storage,
	}) => {
		poolTransactions.push(makeTransaction(alice, 0n));
		const broadcastTransactions = spy(broadcaster, "broadcastTransactions");
		const mempoolFlush = spy(mempool, "flush");
		const storageFlush = spy(storage, "flush");

		await service.commit([], 0, false);
		broadcastTransactions.calledOnce();

		await service.flush();
		mempoolFlush.calledOnce();
		storageFlush.calledOnce();

		// Without the cleanup the pending cooldown (blockNumber + 1) would still suppress this.
		stateStore.blockNumber++;
		await service.commit([], 0, false);
		broadcastTransactions.calledTimes(2);
	});

	it("flush - should do nothing when disposed", async ({ service, mempool, storage }) => {
		const mempoolFlush = spy(mempool, "flush");
		const storageFlush = spy(storage, "flush");

		service.dispose();
		await service.flush();

		mempoolFlush.neverCalled();
		storageFlush.neverCalled();
	});

	each(
		"boot - should flush the pool when %s is set",
		async ({ context: { service, mempool, storage }, dataset: name }) => {
			process.env[name] = "true";
			const mempoolFlush = spy(mempool, "flush");
			const storageFlush = spy(storage, "flush");

			await service.boot();

			mempoolFlush.calledOnce();
			storageFlush.calledOnce();
		},
		resetVariables,
	);

	it("boot - should keep the pool when no reset is requested", async ({ service, mempool, storage }) => {
		const mempoolFlush = spy(mempool, "flush");
		const storageFlush = spy(storage, "flush");

		await service.boot();

		mempoolFlush.neverCalled();
		storageFlush.neverCalled();
	});

	it("boot - should clear a pending cooldown when a removal event arrives", async ({
		service,
		broadcaster,
		listeners,
		poolTransactions,
		stateStore,
	}) => {
		const transaction = makeTransaction(alice, 0n);
		poolTransactions.push(transaction);
		const broadcastTransactions = spy(broadcaster, "broadcastTransactions");

		await service.boot();

		await service.commit([], 0, false);
		broadcastTransactions.calledOnce();

		await listeners[Events.TransactionEvent.RemovedFromPool].handle({
			data: transaction.toData(),
			name: Events.TransactionEvent.RemovedFromPool,
		});

		// Without the listener the pending cooldown (blockNumber + 1) would still suppress this.
		stateStore.blockNumber++;
		await service.commit([], 0, false);
		broadcastTransactions.calledTimes(2);
	});

	it("boot - should clear a pending cooldown when an expiry event arrives", async ({
		service,
		broadcaster,
		listeners,
		poolTransactions,
		stateStore,
	}) => {
		const transaction = makeTransaction(alice, 0n);
		poolTransactions.push(transaction);
		const broadcastTransactions = spy(broadcaster, "broadcastTransactions");

		await service.boot();

		await service.commit([], 0, false);
		broadcastTransactions.calledOnce();

		await listeners[Events.TransactionEvent.Expired].handle({
			data: transaction.toData(),
			name: Events.TransactionEvent.Expired,
		});

		stateStore.blockNumber++;
		await service.commit([], 0, false);
		broadcastTransactions.calledTimes(2);
	});

	it("dispose - should forget the listener it registered for both removal events", async ({
		service,
		events,
		listeners,
	}) => {
		const forget = spy(events, "forget");
		await service.boot();

		service.dispose();

		forget.calledTimes(2);
		forget.calledWith(Events.TransactionEvent.RemovedFromPool, listeners[Events.TransactionEvent.RemovedFromPool]);
		forget.calledWith(Events.TransactionEvent.Expired, listeners[Events.TransactionEvent.Expired]);
	});
});
