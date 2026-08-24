import { Events, Identifiers } from "@mainsail/constants";
import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";

import { Service } from "./service";

const makeTransaction = (index: number): any => ({
	from: `sender-${index}`,
	gasPrice: 100 * 1e9,
	hash: `tx-${index}`,
	senderPublicKey: `sender-public-key-${index}`,
	serialized: Buffer.from(`dummy-${index}`),
	toData: () => ({ hash: `tx-${index}` }),
});

describe<{
	app: Application;
	service: Service;
	blockNumber: number;
	listeners: Record<string, any>;
	poolTransactions: any[];
	config: Record<string, number>;
	broadcaster: any;
	events: any;
	mempool: any;
	poolQuery: any;
	stateStore: any;
	storage: any;
}>("Service", ({ it, beforeEach, stub, spy }) => {
	beforeEach((context) => {
		context.blockNumber = 100;
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

		context.mempool = {
			addTransaction: async () => {},
			flush: () => {},
			getSize: () => context.poolTransactions.length,
			reAddTransactions: async () => [],
			removeTransaction: async () => [],
		};

		context.poolQuery = {
			getFromHighestPriority: () => ({ all: async () => context.poolTransactions }),
			getFromLowestPriority: () => ({ first: async () => context.poolTransactions.at(-1) }),
		};

		context.stateStore = {
			getBlockNumber: () => context.blockNumber,
		};

		context.storage = {
			addTransaction: () => {},
			flush: () => {},
			getAllTransactions: () => [],
			getOldTransactions: () => [],
			hasTransaction: () => false,
			removeTransaction: () => {},
		};

		context.app = new Application();
		context.app.bind(Identifiers.ServiceProvider.Configuration).toConstantValue({
			getRequired: (key: string) => context.config[key],
		});
		context.app.bind(Identifiers.Cryptography.Identity.Address.Factory).toConstantValue({
			fromPublicKey: async (publicKey: string) => publicKey,
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
		context.app.bind(Identifiers.Services.Log.Service).toConstantValue({
			debug: () => {},
			error: () => {},
			info: () => {},
			warn: () => {},
		});
		context.app.bind(Identifiers.Cryptography.Transaction.Factory).toConstantValue({
			fromBytes: async () => {
				throw new Error("not implemented");
			},
		});

		context.service = context.app.resolve(Service);
	});

	it("commit - should remove re-added transactions from storage and dispatch events", async (context) => {
		const transaction = makeTransaction(0);
		stub(context.mempool, "reAddTransactions").resolvedValue([transaction]);
		const removeTransaction = spy(context.storage, "removeTransaction");
		const dispatch = spy(context.events, "dispatch");

		await context.service.commit([transaction.from], 0, true);

		removeTransaction.calledWith(transaction.hash);
		dispatch.calledWith(Events.TransactionEvent.RemovedFromPool, transaction.toData());
	});

	it("commit - should expire old transactions and dispatch them", async (context) => {
		const transaction = makeTransaction(0);
		stub(context.storage, "getOldTransactions").returnValue([
			{
				blockNumber: 1,
				hash: transaction.hash,
				senderPublicKey: transaction.senderPublicKey,
				serialized: transaction.serialized,
			},
		]);
		stub(context.mempool, "removeTransaction").resolvedValue([transaction]);
		const removeTransaction = spy(context.storage, "removeTransaction");
		const dispatch = spy(context.events, "dispatch");

		await context.service.commit([], 0, true);

		removeTransaction.calledWith(transaction.hash);
		dispatch.calledWith(Events.TransactionEvent.Expired, transaction.toData());
	});

	it("commit - should remove an expired transaction from storage even when it is no longer in the mempool", async (context) => {
		const transaction = makeTransaction(0);
		stub(context.storage, "getOldTransactions").returnValue([
			{
				blockNumber: 1,
				hash: transaction.hash,
				senderPublicKey: transaction.senderPublicKey,
				serialized: transaction.serialized,
			},
		]);
		const removeTransaction = spy(context.storage, "removeTransaction");
		const dispatch = spy(context.events, "dispatch");

		await context.service.commit([], 0, true);

		removeTransaction.calledWith(transaction.hash);
		dispatch.neverCalled();
	});

	it("commit - should rebroadcast pool transactions when the block is not full", async (context) => {
		context.poolTransactions = [makeTransaction(0), makeTransaction(1)];
		const broadcastTransactions = spy(context.broadcaster, "broadcastTransactions");

		await context.service.commit([], 0, false);

		broadcastTransactions.calledOnce();
		broadcastTransactions.calledWith(context.poolTransactions);
	});

	it("commit - should not rebroadcast within the cooldown window", async (context) => {
		context.poolTransactions = [makeTransaction(0)];
		const broadcastTransactions = spy(context.broadcaster, "broadcastTransactions");

		await context.service.commit([], 0, false);
		broadcastTransactions.calledOnce();

		// The cooldown is blockNumber + 1 (rebroadcastCooldownBlocks: 1), so the next block skips it.
		context.blockNumber++;
		await context.service.commit([], 0, false);
		broadcastTransactions.calledOnce();
	});

	it("commit - should rebroadcast again after the cooldown window has passed", async (context) => {
		context.poolTransactions = [makeTransaction(0)];
		const broadcastTransactions = spy(context.broadcaster, "broadcastTransactions");

		await context.service.commit([], 0, false);
		broadcastTransactions.calledOnce();

		context.blockNumber += 2;
		await context.service.commit([], 0, false);
		broadcastTransactions.calledTimes(2);
	});

	it("commit - should not rebroadcast when syncing", async (context) => {
		context.poolTransactions = [makeTransaction(0)];
		const broadcastTransactions = spy(context.broadcaster, "broadcastTransactions");

		await context.service.commit([], 0, true);

		broadcastTransactions.neverCalled();
	});

	it("commit - should not rebroadcast when the block is sufficiently full", async (context) => {
		context.poolTransactions = [makeTransaction(0)];
		const broadcastTransactions = spy(context.broadcaster, "broadcastTransactions");

		// rebroadcastThreshold is 60% of maxGasLimit 10_000_000.
		await context.service.commit([], 6_000_001, false);

		broadcastTransactions.neverCalled();
	});

	it("commit - should limit rebroadcast to maxTransactionsPerRequest", async (context) => {
		context.config.maxTransactionsPerRequest = 2;
		context.poolTransactions = [makeTransaction(0), makeTransaction(1), makeTransaction(2)];
		const broadcastTransactions = spy(context.broadcaster, "broadcastTransactions");

		await context.service.commit([], 0, false);

		broadcastTransactions.calledWith([context.poolTransactions[0], context.poolTransactions[1]]);
	});

	it("addTransaction - should hold back rebroadcast of a just-added transaction until the next block", async (context) => {
		const transaction = makeTransaction(0);
		const broadcastTransactions = spy(context.broadcaster, "broadcastTransactions");

		await context.service.addTransaction(transaction);
		context.poolTransactions = [transaction];

		// Still within the same block as the add: the add-time cooldown suppresses it.
		await context.service.commit([], 0, false);
		broadcastTransactions.neverCalled();

		context.blockNumber++;
		await context.service.commit([], 0, false);
		broadcastTransactions.calledOnce();
	});

	it("flush - should flush mempool and storage and clear the cooldowns of the flushed transactions", async (context) => {
		context.poolTransactions = [makeTransaction(0)];
		const broadcastTransactions = spy(context.broadcaster, "broadcastTransactions");
		const mempoolFlush = spy(context.mempool, "flush");
		const storageFlush = spy(context.storage, "flush");

		await context.service.commit([], 0, false);
		broadcastTransactions.calledOnce();

		await context.service.flush();
		mempoolFlush.calledOnce();
		storageFlush.calledOnce();

		// Without the cleanup the pending cooldown (blockNumber + 1) would still suppress this.
		context.blockNumber++;
		await context.service.commit([], 0, false);
		broadcastTransactions.calledTimes(2);
	});

	it("boot - should clear a pending cooldown when a removal event arrives", async (context) => {
		const transaction = makeTransaction(0);
		context.poolTransactions = [transaction];
		const broadcastTransactions = spy(context.broadcaster, "broadcastTransactions");

		await context.service.boot();

		await context.service.commit([], 0, false);
		broadcastTransactions.calledOnce();

		await context.listeners[Events.TransactionEvent.RemovedFromPool].handle({
			data: transaction.toData(),
			name: Events.TransactionEvent.RemovedFromPool,
		});

		// Without the listener the pending cooldown (blockNumber + 1) would still suppress this.
		context.blockNumber++;
		await context.service.commit([], 0, false);
		broadcastTransactions.calledTimes(2);
	});

	it("boot - should clear a pending cooldown when an expiry event arrives", async (context) => {
		const transaction = makeTransaction(0);
		context.poolTransactions = [transaction];
		const broadcastTransactions = spy(context.broadcaster, "broadcastTransactions");

		await context.service.boot();

		await context.service.commit([], 0, false);
		broadcastTransactions.calledOnce();

		await context.listeners[Events.TransactionEvent.Expired].handle({
			data: transaction.toData(),
			name: Events.TransactionEvent.Expired,
		});

		context.blockNumber++;
		await context.service.commit([], 0, false);
		broadcastTransactions.calledTimes(2);
	});

	it("reAddTransactions - should clear cooldowns of transactions that are not re-added", async (context) => {
		context.config.maxTransactionAge = 10;
		const [expiredTransaction, failingTransaction] = [makeTransaction(0), makeTransaction(1)];
		context.poolTransactions = [expiredTransaction, failingTransaction];
		const broadcastTransactions = spy(context.broadcaster, "broadcastTransactions");

		await context.service.commit([], 0, false);
		broadcastTransactions.calledOnce();

		// One stored transaction is expired, the other fails re-adding (factory throws).
		stub(context.storage, "getAllTransactions").returnValue([
			{ blockNumber: 80, hash: expiredTransaction.hash, serialized: expiredTransaction.serialized },
			{ blockNumber: 95, hash: failingTransaction.hash, serialized: failingTransaction.serialized },
		]);
		await context.service.reAddTransactions();

		// Without the cooldown cleanup the pending cooldowns (blockNumber + 1) would suppress both.
		context.blockNumber++;
		await context.service.commit([], 0, false);
		broadcastTransactions.calledTimes(2);
		broadcastTransactions.calledWith([expiredTransaction, failingTransaction]);
	});

	it("dispose - should unsubscribe the removal listener", async (context) => {
		const forget = spy(context.events, "forget");

		context.service.dispose();

		forget.calledTimes(2);
	});

	it("commit - should do nothing when disposed", async (context) => {
		context.poolTransactions = [makeTransaction(0)];
		const broadcastTransactions = spy(context.broadcaster, "broadcastTransactions");

		context.service.dispose();
		await context.service.commit([], 0, false);

		broadcastTransactions.neverCalled();
	});
});
