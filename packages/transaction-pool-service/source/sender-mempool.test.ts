import type { Contracts } from "@mainsail/contracts";

import { Identifiers } from "@mainsail/constants";
import { SenderExceededMaximumTransactionCountError } from "@mainsail/exceptions";
import { Application, Providers } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";

import { SenderMempool } from "./sender-mempool";

const address = "0x75545540230d5c3BEf023202d23CB74cFA723376";
const legacyAddress = "DH8WhBj6ron2tQhdFPQzjDcrk2CCY997MP";

const makeTransaction = (nonce: bigint, gasPrice = 5): Contracts.Crypto.Transaction =>
	({ from: address, gasPrice, hash: `hash-${nonce}-${gasPrice}`, nonce }) as unknown as Contracts.Crypto.Transaction;

const addTransactions = async (senderMempool: SenderMempool, count: number) => {
	const transactions = Array.from({ length: count }, (_, nonce) => makeTransaction(BigInt(nonce)));
	for (const transaction of transactions) {
		await senderMempool.addTransaction(transaction);
	}

	return transactions;
};

const makeSenderState = () => {
	const senderState = {
		apply: async (transaction: Contracts.Crypto.Transaction) => {
			if (transaction.nonce !== senderState.nonce) {
				throw new Error(`unexpected nonce ${transaction.nonce}`);
			}

			senderState.nonce++;
		},
		chainNonce: 0n,
		configure: async () => senderState,
		getNonce: () => senderState.nonce,
		nonce: 0n,
		replace: async () => true,
		reset: async () => {
			senderState.nonce = senderState.chainNonce;
		},
		revert: () => {
			senderState.nonce--;
		},
	};

	return senderState;
};

const nextTick = async () => new Promise((resolve) => setImmediate(resolve));

const deferred = () => {
	let resolve!: () => void;
	const promise = new Promise<void>((r) => (resolve = r));
	return { promise, resolve };
};

describe<{
	app: Application;
	senderMempool: SenderMempool;
	senderState: ReturnType<typeof makeSenderState>;
	config: Providers.PluginConfiguration;
}>("SenderMempool", ({ it, assert, beforeEach, spy, stub }) => {
	beforeEach(async (context) => {
		context.config = new Providers.PluginConfiguration().from("", { maxTransactionsPerSender: 3 });
		context.senderState = makeSenderState();

		context.app = new Application();
		context.app
			.bind(Identifiers.ServiceProvider.Configuration)
			.toConstantValue(context.config)
			.whenTagged("plugin", "transaction-pool-service");
		context.app.bind(Identifiers.TransactionPool.SenderState).toConstantValue(context.senderState);

		context.senderMempool = await context.app.resolve(SenderMempool).configure(address, legacyAddress);
	});

	it("configure - should configure the sender state and return itself", async ({ senderMempool, senderState }) => {
		const configure = spy(senderState, "configure");

		assert.equal(await senderMempool.configure(address, legacyAddress), senderMempool);

		configure.calledOnce();
		configure.calledWith(address, legacyAddress);
	});

	it("isDisposable - should return true initially", ({ senderMempool }) => {
		assert.true(senderMempool.isDisposable());
	});

	it("isDisposable - should return false while holding transactions", async ({ senderMempool }) => {
		const [transaction] = await addTransactions(senderMempool, 1);
		assert.false(senderMempool.isDisposable());

		senderMempool.removeTransaction(transaction.hash);
		assert.true(senderMempool.isDisposable());
	});

	it("isDisposable - should return false while a transaction is being added", async ({
		senderMempool,
		senderState,
	}) => {
		const apply = deferred();
		stub(senderState, "apply").callsFake(() => apply.promise);

		const adding = senderMempool.addTransaction(makeTransaction(0n));
		await nextTick();
		assert.false(senderMempool.isDisposable());

		apply.resolve();
		await adding;
	});

	it("getSize - should return the number of added transactions", async ({ senderMempool }) => {
		assert.equal(senderMempool.getSize(), 0);

		await addTransactions(senderMempool, 2);

		assert.equal(senderMempool.getSize(), 2);
	});

	it("getFromEarliest - should return transactions in the order they were added", async ({ senderMempool }) => {
		const transactions = await addTransactions(senderMempool, 3);

		assert.equal([...senderMempool.getFromEarliest()], transactions);
	});

	it("getFromLatest - should return transactions in reverse order", async ({ senderMempool }) => {
		const transactions = await addTransactions(senderMempool, 3);

		assert.equal([...senderMempool.getFromLatest()], [...transactions].reverse());
	});

	it("getFromEarliest and getFromLatest - should return snapshots of the queue", async ({ senderMempool }) => {
		const [transaction] = await addTransactions(senderMempool, 1);
		const earliest = senderMempool.getFromEarliest();
		const latest = senderMempool.getFromLatest();

		senderMempool.removeTransaction(transaction.hash);

		assert.equal([...earliest], [transaction]);
		assert.equal([...latest], [transaction]);
	});

	it("addTransaction - should apply the transaction to the sender state", async ({ senderMempool }) => {
		const transaction = makeTransaction(0n);
		assert.equal(senderMempool.getNonce(), 0n);

		await senderMempool.addTransaction(transaction);

		assert.equal(senderMempool.getNonce(), 1n);
		assert.equal([...senderMempool.getFromEarliest()], [transaction]);
	});

	it("addTransaction - should not keep a transaction the sender state rejects", async ({ senderMempool }) => {
		await assert.rejects(() => senderMempool.addTransaction(makeTransaction(1n)), "unexpected nonce");

		assert.equal(senderMempool.getSize(), 0);
		assert.true(senderMempool.isDisposable());
	});

	it("addTransaction - should throw when the sender reached the maximum transaction count", async ({
		senderMempool,
		config,
	}) => {
		config.set("maxTransactionsPerSender", 2);
		await addTransactions(senderMempool, 2);
		assert.equal(senderMempool.getNonce(), 2n);

		await assert.rejects(
			() => senderMempool.addTransaction(makeTransaction(2n)),
			SenderExceededMaximumTransactionCountError,
		);

		assert.equal(senderMempool.getNonce(), 2n);
		assert.equal(senderMempool.getSize(), 2);
	});

	it("addTransaction - should allow allowed senders to exceed the maximum transaction count", async ({
		senderMempool,
		config,
	}) => {
		config.set("maxTransactionsPerSender", 2);
		config.set("allowedSenders", [address]);

		await addTransactions(senderMempool, 3);

		assert.equal(senderMempool.getSize(), 3);
	});

	it("addTransaction - should apply concurrent adds one at a time and in order", async ({
		senderMempool,
		senderState,
	}) => {
		const first = deferred();
		const apply = stub(senderState, "apply").callsFakeNth(0, () => first.promise);
		const transactions = [makeTransaction(0n), makeTransaction(1n)];

		const adding = transactions.map(async (transaction) => senderMempool.addTransaction(transaction));
		await nextTick();

		// The second add waits for the first to finish applying.
		apply.calledOnce();

		first.resolve();
		await Promise.all(adding);

		apply.calledTimes(2);
		apply.calledNthWith(0, transactions[0]);
		apply.calledNthWith(1, transactions[1]);
		assert.equal([...senderMempool.getFromEarliest()], transactions);
	});

	it("removeTransaction - should return nothing for an unknown transaction", async ({ senderMempool }) => {
		await addTransactions(senderMempool, 1);
		assert.equal(senderMempool.getNonce(), 1n);

		assert.equal(senderMempool.removeTransaction("unknown"), []);

		assert.equal(senderMempool.getNonce(), 1n);
		assert.equal(senderMempool.getSize(), 1);
	});

	it("removeTransaction - should remove and revert the transaction and all later ones, latest first", async ({
		senderMempool,
	}) => {
		const transactions = await addTransactions(senderMempool, 3);
		assert.equal(senderMempool.getNonce(), 3n);

		assert.equal(senderMempool.removeTransaction(transactions[1].hash), [transactions[2], transactions[1]]);

		assert.equal(senderMempool.getNonce(), 1n);
		assert.equal([...senderMempool.getFromEarliest()], [transactions[0]]);
	});

	it("replaceTransaction - should do nothing when the queue is empty", async ({ senderMempool }) => {
		assert.equal(await senderMempool.replaceTransaction(makeTransaction(0n, 10)), []);
	});

	it("replaceTransaction - should do nothing when the nonce is above every queued transaction", async ({
		senderMempool,
	}) => {
		const transactions = await addTransactions(senderMempool, 1);

		assert.equal(await senderMempool.replaceTransaction(makeTransaction(1n, 10)), []);

		assert.equal([...senderMempool.getFromEarliest()], transactions);
	});

	it("replaceTransaction - should throw when the nonce is below every queued transaction", async ({
		senderMempool,
		senderState,
	}) => {
		senderState.nonce = 5n;
		await senderMempool.addTransaction(makeTransaction(5n));
		await senderMempool.addTransaction(makeTransaction(6n));

		await assert.rejects(
			() => senderMempool.replaceTransaction(makeTransaction(4n, 10)),
			"transaction nonce mismatch",
		);

		assert.equal(senderMempool.getSize(), 2);
	});

	it("replaceTransaction - should do nothing when the gas price is not higher", async ({ senderMempool }) => {
		const transactions = await addTransactions(senderMempool, 1);

		assert.equal(await senderMempool.replaceTransaction(makeTransaction(0n, 5)), []);
		assert.equal(await senderMempool.replaceTransaction(makeTransaction(0n, 4)), []);

		assert.equal([...senderMempool.getFromEarliest()], transactions);
	});

	it("replaceTransaction - should swap in the new transaction and keep later ones when the state allows it", async ({
		senderMempool,
		senderState,
	}) => {
		const transactions = await addTransactions(senderMempool, 3);
		const replace = spy(senderState, "replace");
		const replacement = makeTransaction(1n, 10);
		assert.equal(senderMempool.getNonce(), 3n);

		assert.equal(await senderMempool.replaceTransaction(replacement), [transactions[1]]);

		replace.calledWith(transactions[1], replacement, 3n);
		assert.equal(senderMempool.getNonce(), 3n);
		assert.equal([...senderMempool.getFromEarliest()], [transactions[0], replacement, transactions[2]]);
	});

	it("replaceTransaction - should re-add the new and later transactions when the state refuses the swap", async ({
		senderMempool,
		senderState,
	}) => {
		const transactions = await addTransactions(senderMempool, 3);
		stub(senderState, "replace").resolvedValue(false);
		const replacement = makeTransaction(1n, 10);
		assert.equal(senderMempool.getNonce(), 3n);

		assert.equal(await senderMempool.replaceTransaction(replacement), [transactions[1]]);

		assert.equal(senderMempool.getNonce(), 3n);
		assert.equal([...senderMempool.getFromEarliest()], [transactions[0], replacement, transactions[2]]);
	});

	it("replaceTransaction - should drop later transactions that no longer fit after the swap", async ({
		senderMempool,
		senderState,
	}) => {
		const transactions = await addTransactions(senderMempool, 3);
		stub(senderState, "replace").resolvedValue(false);
		const { apply } = senderState;
		stub(senderState, "apply").callsFake(async (transaction: Contracts.Crypto.Transaction) => {
			if (transaction === transactions[2]) {
				throw new Error("insufficient balance");
			}

			return apply(transaction);
		});
		const replacement = makeTransaction(1n, 10);
		assert.equal(senderMempool.getNonce(), 3n);

		assert.equal(await senderMempool.replaceTransaction(replacement), [transactions[1], transactions[2]]);

		assert.equal(senderMempool.getNonce(), 2n);
		assert.equal([...senderMempool.getFromEarliest()], [transactions[0], replacement]);
	});

	it("replaceTransaction - should throw and keep the queue when the state rejects the new transaction", async ({
		senderMempool,
		senderState,
	}) => {
		const transactions = await addTransactions(senderMempool, 2);
		stub(senderState, "replace").rejectedValue(new Error("preverify failed"));
		assert.equal(senderMempool.getNonce(), 2n);

		await assert.rejects(() => senderMempool.replaceTransaction(makeTransaction(0n, 10)), "preverify failed");

		assert.equal(senderMempool.getNonce(), 2n);
		assert.equal([...senderMempool.getFromEarliest()], transactions);
	});

	it("reAddTransactions - should re-apply every transaction on top of the reset sender state", async ({
		senderMempool,
	}) => {
		const transactions = await addTransactions(senderMempool, 2);
		assert.equal(senderMempool.getNonce(), 2n);

		assert.equal(await senderMempool.reAddTransactions(), []);

		assert.equal(senderMempool.getNonce(), 2n);
		assert.equal([...senderMempool.getFromEarliest()], transactions);
	});

	it("reAddTransactions - should return and drop the transactions that no longer apply", async ({
		senderMempool,
		senderState,
	}) => {
		const transactions = await addTransactions(senderMempool, 3);
		// A block included the first transaction.
		senderState.chainNonce = 1n;
		assert.equal(senderMempool.getNonce(), 3n);

		assert.equal(await senderMempool.reAddTransactions(), [transactions[0]]);

		assert.equal(senderMempool.getNonce(), 3n);
		assert.equal([...senderMempool.getFromEarliest()], transactions.slice(1));
	});

	it("reAddTransactions - should leave the mempool disposable when nothing applies any more", async ({
		senderMempool,
		senderState,
	}) => {
		await addTransactions(senderMempool, 1);
		senderState.chainNonce = 1n;

		assert.length(await senderMempool.reAddTransactions(), 1);

		assert.true(senderMempool.isDisposable());
	});
});
