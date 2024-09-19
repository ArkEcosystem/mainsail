import { Contracts } from "@mainsail/contracts";
import { describe, Sandbox } from "@mainsail/test-framework";
import { Transfers } from "@mainsail/test-transaction-builders";

import { setup, shutdown } from "./setup.js";
import { Snapshot, takeSnapshot } from "./snapshot.js";
import { addTransactionsToPool, getWallets, hasBalance, isTransactionCommitted, waitBlock } from "./utils.js";

describe<{
	sandbox: Sandbox;
	snapshot: Snapshot;
	wallets: Contracts.Crypto.KeyPair[];
}>("Transfer", ({ beforeEach, afterEach, it, assert }) => {
	beforeEach(async (context) => {
		context.sandbox = await setup();
		context.wallets = await getWallets(context.sandbox);
		context.snapshot = await takeSnapshot(context.sandbox);
	});

	afterEach(async ({ sandbox, snapshot }) => {
		await snapshot.validate();

		await shutdown(sandbox);
	});

	it("should accept and commit simple transfer", async (context) => {
		const tx = await Transfers.makeTransfer(context);

		const result = await addTransactionsToPool(context, [tx]);
		assert.equal(result.accept, [0]);
		assert.equal(result.broadcast, [0]);

		await waitBlock(context);

		assert.true(await isTransactionCommitted(context, tx));
	});

	it("should accept and transfer funds [multi signature]", async (context) => {
		const [multiSigRegistrationTx, fundTx, transferTx] = await Transfers.makeTransferWithMultiSignature(context);

		// Register multi sig wallet
		await addTransactionsToPool(context, [multiSigRegistrationTx]);
		await waitBlock(context);

		// Now send funds to multi sig wallet
		await addTransactionsToPool(context, [fundTx]);
		await waitBlock(context);

		assert.true(await hasBalance(context, fundTx.data.recipientId!, fundTx.data.amount));

		// Send funds from multi sig to another random wallet
		await addTransactionsToPool(context, [transferTx]);
		await waitBlock(context);

		assert.true(await hasBalance(context, transferTx.data.recipientId!, transferTx.data.amount));
	});

	it("should not accept simple transfer [invalid fee]", async (context) => {
		const tx = await Transfers.makeTransferInvalidFee(context);

		const result = await addTransactionsToPool(context, [tx]);
		assert.equal(result.invalid, [0]);
		assert.equal(result.errors, {
			0: {
				message: `tx ${tx.id} fee is too low to enter the pool`,
				type: "ERR_LOW_FEE",
			},
		});

		await waitBlock(context);
		assert.false(await isTransactionCommitted(context, tx));
	});

	it("should not accept simple transfer [invalid amount]", async (context) => {
		const tx1 = await Transfers.makeTransferInsufficientBalance(context);
		const tx2 = await Transfers.makeTransferZeroBalance(context);

		const result = await addTransactionsToPool(context, [tx1, tx2]);
		assert.equal(result.invalid, [0, 1]);
		assert.equal(result.errors, {
			0: {
				message: `tx ${tx1.id} cannot be applied: Insufficient balance in the wallet.`,
				type: "ERR_APPLY",
			},
			1: {
				message: `Invalid transaction data: data/amount must pass "bignumber" keyword validation, data must have required property 'signatures', data must have required property 'signatures', data must match a schema in anyOf`,
				type: "ERR_BAD_DATA",
			},
		});
	});

	it("should not accept simple transfer [invalid signature]", async (context) => {
		const tx = await Transfers.makeTransferInvalidSignature(context);

		const result = await addTransactionsToPool(context, [tx]);
		assert.equal(result.invalid, [0]);
		assert.equal(result.errors![0].type, "ERR_BAD_DATA");
		assert.true(result.errors![0].message.includes("didn't pass verification"));

		await waitBlock(context);
		assert.false(await isTransactionCommitted(context, tx));
	});

	it("should not accept simple transfer [malformed signature]", async (context) => {
		const tx = await Transfers.makeTransferMalformedSignature(context);

		const result = await addTransactionsToPool(context, [tx]);
		assert.equal(result.invalid, [0]);
		assert.equal(result.errors, {
			0: {
				message:
					"Invalid transaction data: Failed to deserialize transaction, encountered invalid bytes: Read over buffer boundary. (length: 64, remaining: 12, diff: 52)",
				type: "ERR_BAD_DATA",
			},
		});

		await waitBlock(context);
		assert.false(await isTransactionCommitted(context, tx));
	});

	it("should not accept simple transfer [invalid nonce]", async (context) => {
		const tx1 = await Transfers.makeTransferInvalidNonceTooHigh(context);
		const tx2 = await Transfers.makeTransferInvalidNonceTooLow(context);

		const result = await addTransactionsToPool(context, [tx1, tx2]);
		assert.equal(result.invalid, [0, 1]);
		assert.equal(result.errors, {
			0: {
				message: `tx ${tx1.id} cannot be applied: Cannot apply a transaction with nonce 6: the sender ${tx1.data.senderPublicKey} has nonce 3.`,
				type: "ERR_APPLY",
			},
			1: {
				message: `tx ${tx2.id} cannot be applied: Cannot apply a transaction with nonce 0: the sender ${tx2.data.senderPublicKey} has nonce 3.`,
				type: "ERR_APPLY",
			},
		});
	});

	it("should not accept simple transfer [invalid network]", async (context) => {
		const tx = await Transfers.makeTransferInvalidNetwork(context);

		const result = await addTransactionsToPool(context, [tx]);
		assert.equal(result.invalid, [0]);
		assert.equal(result.errors, {
			0: {
				message: `Invalid transaction data: data/network must pass "network" keyword validation, data must have required property 'signatures', data must have required property 'signatures', data must match a schema in anyOf`,
				type: "ERR_BAD_DATA",
			},
		});
	});

	it("should not accept simple transfer [invalid header]", async (context) => {
		const tx = await Transfers.makeTransferInvalidHeader(context);

		const result = await addTransactionsToPool(context, [tx]);
		assert.equal(result.invalid, [0]);
		assert.equal(result.errors![0].type, "ERR_BAD_DATA");
		assert.true(result.errors![0].message.endsWith("didn't pass verification"));
	});

	it("should not accept simple transfer [invalid version]", async (context) => {
		const txs = await Transfers.makeTransferInvalidVersions(context);

		const result = await addTransactionsToPool(context, txs);
		assert.equal(result.invalid, [0, 1]);
		assert.equal(result.errors![0].type, "ERR_BAD_DATA");
		assert.true(result.errors![0].message.endsWith("didn't pass verification"));
		assert.equal(result.errors![1].type, "ERR_BAD_DATA");
		assert.equal(
			result.errors![1].message,
			"Invalid transaction data: data/version must be equal to one of the allowed values, data must have required property 'signatures', data must have required property 'signatures', data must match a schema in anyOf",
		);
	});
});
