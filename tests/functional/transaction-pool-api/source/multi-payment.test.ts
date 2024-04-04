import { Contracts } from "@mainsail/contracts";
import { describe, Sandbox } from "@mainsail/test-framework";
import { MultiPayments } from "@mainsail/test-transaction-builders";
import { BigNumber } from "@mainsail/utils";

import { setup, shutdown } from "./setup.js";
import { Snapshot, takeSnapshot } from "./snapshot.js";
import { addTransactionsToPool, getWallets, hasBalance, waitBlock } from "./utils.js";

describe<{
	sandbox: Sandbox;
	snapshot: Snapshot;
	wallets: Contracts.Crypto.KeyPair[];
}>("MultiPayment", ({ beforeEach, afterEach, it, assert }) => {
	beforeEach(async (context) => {
		context.sandbox = await setup();
		context.wallets = await getWallets(context.sandbox);
		context.snapshot = await takeSnapshot(context.sandbox);
	});

	afterEach(async ({ sandbox, snapshot }) => {
		await snapshot.validate();

		return shutdown(sandbox);
	});

	it("should accept multi payment", async (context) => {
		const tx = await MultiPayments.makeValidMultiPayment(context);

		await addTransactionsToPool(context, [tx]);
		await waitBlock(context);
	});

	it("should accept multi payment with same recipients", async (context) => {
		const tx = await MultiPayments.makeValidMultiPaymentSameRecipients(context);

		await addTransactionsToPool(context, [tx]);
		await waitBlock(context);
	});

	it("should accept multi payment to self", async (context) => {
		const tx = await MultiPayments.makeValidMultiPaymentToSelf(context);

		await addTransactionsToPool(context, [tx]);
		await waitBlock(context);
	});

	it("should accept multi payment with max payments", async (context) => {
		const tx = await MultiPayments.makeValidMultiPaymentWithMaxPayments(context);

		await addTransactionsToPool(context, [tx]);
		await waitBlock(context);

		for (const payment of tx.data.asset!.payments!) {
			assert.true(await hasBalance(context, payment.recipientId, BigNumber.make(1000)));
		}
	});

	it("should reject multi payment exceeding max payments", async (context) => {
		const tx = await MultiPayments.makeInvalidMultiPaymentExceedingMaxPayments(context);

		const result = await addTransactionsToPool(context, [tx]);
		assert.equal(result.accept, []);
		assert.equal(result.invalid, [0]);
		assert.equal(result.errors, {
			0: {
				message: `Invalid transaction data: data/asset/payments must pass "maxMultiPaymentLimit" keyword validation, data must have required property 'signatures', data must have required property 'signatures', data must match a schema in anyOf`,
				type: "ERR_BAD_DATA",
			},
		});
	});

	it("should reject multi payment [invalid amount]", async (context) => {
		const [tx1, tx2] = await MultiPayments.makeInvalidMultiPaymentWithBadAmounts(context);

		const result = await addTransactionsToPool(context, [tx1, tx2]);
		assert.equal(result.accept, []);
		assert.equal(result.invalid, [0, 1]);
		assert.equal(result.errors, {
			0: {
				message: `tx ${tx1.id} cannot be applied: Insufficient balance in the wallet.`,
				type: "ERR_APPLY",
			},
			1: {
				message: `Invalid transaction data: data/asset/payments/0/amount must pass "bignumber" keyword validation, data must have required property 'signatures', data must have required property 'signatures', data must match a schema in anyOf`,
				type: "ERR_BAD_DATA",
			},
		});
	});

	it("should reject multi payment [missing payments]", async (context) => {
		const [tx1, tx2, tx3] = await MultiPayments.makeInvalidMultiPaymentWithMissingPayments(context);

		const result = await addTransactionsToPool(context, [tx1, tx2, tx3]);

		assert.equal(result.accept, []);
		assert.equal(result.invalid, [0, 1, 2]);
		assert.equal(result.errors![0].type, "ERR_BAD_DATA");
		assert.equal(result.errors![1].type, "ERR_BAD_DATA");
		assert.equal(result.errors![2].type, "ERR_BAD_DATA");
	});
});
