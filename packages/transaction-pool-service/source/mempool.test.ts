import type { Contracts } from "@mainsail/contracts";

import { Events, Identifiers } from "@mainsail/constants";
import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";

import { Mempool } from "./mempool";

const alice = "0x75545540230d5c3BEf023202d23CB74cFA723376";
const bob = "0xbbe7B35057F3431E001d2b96817e3061B59849c9";
const legacyAddresses = {
	[alice]: "DH8WhBj6ron2tQhdFPQzjDcrk2CCY997MP",
	[bob]: "DQogphvhHjJsqEhhR7befFiTzHQWLrQV3d",
};

const makeTransaction = (from: string, nonce: bigint, gasPrice = 5): Contracts.Crypto.Transaction =>
	({
		from,
		gasPrice,
		hash: `${from}-${nonce}-${gasPrice}`,
		nonce,
		senderLegacyAddress: legacyAddresses[from],
		toData: () => ({ hash: `${from}-${nonce}-${gasPrice}` }),
	}) as unknown as Contracts.Crypto.Transaction;

const makeSenderMempool = () => ({
	addTransaction: async () => {},
	getNonce: () => 0n,
	getSize: () => 0,
	isDisposable: () => false,
	reAddTransactions: async () => [],
	removeTransaction: () => [],
	replaceTransaction: async () => [],
});

describe<{
	app: Application;
	mempool: Mempool;
	senderMempools: Record<string, ReturnType<typeof makeSenderMempool>>;
	createSenderMempool: any;
	events: any;
	storage: any;
}>("Mempool", ({ it, assert, beforeEach, each, spy, stub, stubFn }) => {
	beforeEach((context) => {
		context.senderMempools = { [alice]: makeSenderMempool(), [bob]: makeSenderMempool() };
		context.createSenderMempool = stubFn().callsFake(async (address: string) => context.senderMempools[address]);
		context.events = { dispatch: async () => {} };
		context.storage = { removeTransaction: () => {} };

		context.app = new Application();
		context.app.bind(Identifiers.Services.Log.Service).toConstantValue({ debug: () => {} });
		context.app
			.bind(Identifiers.TransactionPool.SenderMempool.Factory)
			.toConstantValue(context.createSenderMempool.toFunction());
		context.app.bind(Identifiers.Services.EventDispatcher.Service).toConstantValue(context.events);
		context.app.bind(Identifiers.TransactionPool.Storage).toConstantValue(context.storage);

		context.mempool = context.app.resolve(Mempool);
	});

	it("getSize - should return zero when empty", ({ mempool }) => {
		assert.equal(mempool.getSize(), 0);
	});

	it("getSize - should return the sum of all sender mempool sizes", async ({ mempool, senderMempools }) => {
		await mempool.addTransaction(makeTransaction(alice, 0n));
		await mempool.addTransaction(makeTransaction(bob, 0n));
		stub(senderMempools[alice], "getSize").returnValue(2);
		stub(senderMempools[bob], "getSize").returnValue(3);

		assert.equal(mempool.getSize(), 5);
	});

	it("hasSenderMempool - should return false for an unknown sender", ({ mempool }) => {
		assert.false(mempool.hasSenderMempool(alice));
	});

	it("getSenderMempool - should throw for an unknown sender", ({ mempool }) => {
		assert.throws(() => mempool.getSenderMempool(alice), "Unknown sender");
	});

	it("addTransaction - should create a sender mempool for a new sender", async ({
		mempool,
		createSenderMempool,
		senderMempools,
	}) => {
		await mempool.addTransaction(makeTransaction(alice, 0n));

		createSenderMempool.calledOnce();
		createSenderMempool.calledWith(alice, legacyAddresses[alice]);
		assert.true(mempool.hasSenderMempool(alice));
		assert.equal(mempool.getSenderMempool(alice), senderMempools[alice]);
		assert.equal([...mempool.getSenderMempools()], [senderMempools[alice]]);
	});

	it("addTransaction - should reuse the sender mempool of a known sender", async ({
		mempool,
		createSenderMempool,
	}) => {
		await mempool.addTransaction(makeTransaction(alice, 0n));
		await mempool.addTransaction(makeTransaction(alice, 1n));

		createSenderMempool.calledOnce();
	});

	it("addTransaction - should add a transaction whose nonce is above the sender nonce", async ({
		mempool,
		senderMempools,
	}) => {
		const add = spy(senderMempools[alice], "addTransaction");
		const replace = spy(senderMempools[alice], "replaceTransaction");
		const transaction = makeTransaction(alice, 1n);

		await mempool.addTransaction(transaction);

		add.calledOnce();
		add.calledWith(transaction);
		replace.neverCalled();
	});

	it("addTransaction - should replace a transaction whose nonce is not above the sender nonce", async ({
		mempool,
		senderMempools,
		storage,
		events,
	}) => {
		const dropped = [makeTransaction(alice, 0n), makeTransaction(alice, 1n)];
		const replace = stub(senderMempools[alice], "replaceTransaction").resolvedValue(dropped);
		const add = spy(senderMempools[alice], "addTransaction");
		const removeFromStorage = spy(storage, "removeTransaction");
		const dispatch = spy(events, "dispatch");
		const transaction = makeTransaction(alice, 0n, 10);

		await mempool.addTransaction(transaction);

		replace.calledOnce();
		replace.calledWith(transaction);
		add.neverCalled();
		// Everything the replacement dropped leaves the pool.
		removeFromStorage.calledTimes(2);
		removeFromStorage.calledWith(dropped[0].hash);
		removeFromStorage.calledWith(dropped[1].hash);
		dispatch.calledTimes(2);
		dispatch.calledWith(Events.TransactionEvent.RemovedFromPool, dropped[0].toData());
		dispatch.calledWith(Events.TransactionEvent.RemovedFromPool, dropped[1].toData());
	});

	it("addTransaction - should add the transaction as usual when nothing was replaced", async ({
		mempool,
		senderMempools,
		storage,
	}) => {
		const add = spy(senderMempools[alice], "addTransaction");
		const removeFromStorage = spy(storage, "removeTransaction");
		const transaction = makeTransaction(alice, 0n);

		await mempool.addTransaction(transaction);

		add.calledOnce();
		add.calledWith(transaction);
		removeFromStorage.neverCalled();
	});

	each<"addTransaction" | "replaceTransaction">(
		"addTransaction - should rethrow and dispose of an empty sender mempool when %s fails",
		async ({ context: { mempool, senderMempools }, dataset: method }) => {
			stub(senderMempools[alice], method).rejectedValue(new Error("invalid"));
			stub(senderMempools[alice], "isDisposable").returnValue(true);

			await assert.rejects(() => mempool.addTransaction(makeTransaction(alice, 0n)), "invalid");

			assert.false(mempool.hasSenderMempool(alice));
		},
		["addTransaction", "replaceTransaction"],
	);

	it("addTransaction - should keep a sender mempool that still holds transactions when adding fails", async ({
		mempool,
		senderMempools,
	}) => {
		stub(senderMempools[alice], "addTransaction").rejectedValue(new Error("invalid"));

		await assert.rejects(() => mempool.addTransaction(makeTransaction(alice, 0n)), "invalid");

		assert.true(mempool.hasSenderMempool(alice));
	});

	it("removeTransaction - should return nothing for an unknown sender", async ({ mempool }) => {
		assert.equal(await mempool.removeTransaction(alice, "hash"), []);
	});

	it("removeTransaction - should return what the sender mempool removed and keep it while non-empty", async ({
		mempool,
		senderMempools,
	}) => {
		await mempool.addTransaction(makeTransaction(alice, 0n));
		const removed = [makeTransaction(alice, 1n)];
		const remove = stub(senderMempools[alice], "removeTransaction").returnValue(removed);

		assert.equal(await mempool.removeTransaction(alice, removed[0].hash), removed);

		remove.calledWith(removed[0].hash);
		assert.true(mempool.hasSenderMempool(alice));
	});

	it("removeTransaction - should dispose of a sender mempool that became empty", async ({
		mempool,
		senderMempools,
	}) => {
		await mempool.addTransaction(makeTransaction(alice, 0n));
		stub(senderMempools[alice], "isDisposable").returnValue(true);

		await mempool.removeTransaction(alice, "hash");

		assert.false(mempool.hasSenderMempool(alice));
	});

	it("reAddTransactions - should re-add the given senders and return everything they dropped", async ({
		mempool,
		senderMempools,
	}) => {
		await mempool.addTransaction(makeTransaction(alice, 0n));
		await mempool.addTransaction(makeTransaction(bob, 0n));
		const aliceDropped = [makeTransaction(alice, 0n)];
		const bobDropped = [makeTransaction(bob, 0n)];
		stub(senderMempools[alice], "reAddTransactions").resolvedValue(aliceDropped);
		stub(senderMempools[bob], "reAddTransactions").resolvedValue(bobDropped);

		assert.equal(await mempool.reAddTransactions([alice, bob]), [...aliceDropped, ...bobDropped]);
	});

	it("reAddTransactions - should skip senders without a mempool", async ({ mempool, senderMempools }) => {
		await mempool.addTransaction(makeTransaction(alice, 0n));
		const reAdd = spy(senderMempools[alice], "reAddTransactions");
		const bobReAdd = spy(senderMempools[bob], "reAddTransactions");

		assert.equal(await mempool.reAddTransactions([bob, alice]), []);

		reAdd.calledOnce();
		bobReAdd.neverCalled();
	});

	it("reAddTransactions - should dispose of sender mempools that became empty", async ({
		mempool,
		senderMempools,
	}) => {
		await mempool.addTransaction(makeTransaction(alice, 0n));
		await mempool.addTransaction(makeTransaction(bob, 0n));
		stub(senderMempools[alice], "isDisposable").returnValue(true);

		await mempool.reAddTransactions([alice, bob]);

		assert.false(mempool.hasSenderMempool(alice));
		assert.true(mempool.hasSenderMempool(bob));
	});

	it("flush - should drop every sender mempool", async ({ mempool }) => {
		await mempool.addTransaction(makeTransaction(alice, 0n));
		await mempool.addTransaction(makeTransaction(bob, 0n));

		mempool.flush();

		assert.false(mempool.hasSenderMempool(alice));
		assert.false(mempool.hasSenderMempool(bob));
		assert.equal(mempool.getSize(), 0);
	});
});
