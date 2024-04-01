import { Contracts, Identifiers } from "@mainsail/contracts";
import { describe, Sandbox } from "@mainsail/test-framework";
import { BigNumber } from "@mainsail/utils";

import { setup, shutdown } from "./setup.js";
import { Snapshot, takeSnapshot } from "./snapshot.js";
import {
	addTransactionsToPool,
	getAddressByPublicKey,
	getRandomColdWallet,
	getRandomFundedWallet,
	getWallets,
	hasBalance,
	makeMultiPayment,
	waitBlock,
} from "./utils.js";

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

	it("should accept multi payment", async ({ sandbox, wallets }) => {
		const [sender] = wallets;

		const randomWallet = await getRandomFundedWallet(sandbox, sender);

		const recipient = await getRandomColdWallet(sandbox);
		const recipient2 = await getRandomColdWallet(sandbox);

		const tx = await makeMultiPayment(sandbox, {
			payments: [
				{ amount: BigNumber.make(1000), recipientId: recipient.address },
				{ amount: BigNumber.make(1000), recipientId: recipient2.address },
			],
			sender: randomWallet,
		});

		await addTransactionsToPool(sandbox, [tx]);
		await waitBlock(sandbox);

		assert.true(await hasBalance(sandbox, recipient.address, BigNumber.make(1000)));
		assert.true(await hasBalance(sandbox, recipient2.address, BigNumber.make(1000)));
	});

	it("should accept multi payment with same recipients", async ({ sandbox, wallets }) => {
		const [sender] = wallets;

		const randomWallet = await getRandomFundedWallet(sandbox, sender);

		const recipient = await getRandomColdWallet(sandbox);
		const recipient2 = await getRandomColdWallet(sandbox);

		const tx = await makeMultiPayment(sandbox, {
			payments: [
				{ amount: BigNumber.make(1000), recipientId: recipient.address },
				{ amount: BigNumber.make(1000), recipientId: recipient.address },
				{ amount: BigNumber.make(1000), recipientId: recipient2.address },
			],
			sender: randomWallet,
		});

		await addTransactionsToPool(sandbox, [tx]);
		await waitBlock(sandbox);

		assert.true(await hasBalance(sandbox, recipient.address, BigNumber.make(2000)));
		assert.true(await hasBalance(sandbox, recipient2.address, BigNumber.make(1000)));
	});

	it("should accept multi payment to self", async ({ sandbox, wallets }) => {
		const [sender] = wallets;

		const randomWallet = await getRandomFundedWallet(sandbox, sender);

		const recipient = await getRandomColdWallet(sandbox);

		const tx = await makeMultiPayment(sandbox, {
			payments: [
				{
					amount: BigNumber.make(1000),
					recipientId: await getAddressByPublicKey(sandbox, randomWallet.publicKey),
				},
				{ amount: BigNumber.make(1000), recipientId: recipient.address },
			],
			sender: randomWallet,
		});

		await addTransactionsToPool(sandbox, [tx]);
		await waitBlock(sandbox);

		assert.true(await hasBalance(sandbox, recipient.address, BigNumber.make(1000)));
	});

	it("should accept multi payment with max payments", async ({ sandbox, wallets }) => {
		const [sender] = wallets;

		const randomWallet = await getRandomFundedWallet(sandbox, sender);

		const payments: Contracts.Crypto.MultiPaymentItem[] = [];
		for (let i = 0; i < 256; i++) {
			const recipient = await getRandomColdWallet(sandbox);
			payments.push({ amount: BigNumber.make(1000), recipientId: recipient.address });
		}

		const tx = await makeMultiPayment(sandbox, {
			payments,
			sender: randomWallet,
		});

		await addTransactionsToPool(sandbox, [tx]);
		await waitBlock(sandbox);

		for (const payment of payments) {
			assert.true(await hasBalance(sandbox, payment.recipientId, BigNumber.make(1000)));
		}
	});

	it("should reject multi payment exceeding max payments", async ({ sandbox, wallets }) => {
		const [sender] = wallets;

		const randomWallet = await getRandomFundedWallet(sandbox, sender);

		const payments: Contracts.Crypto.MultiPaymentItem[] = [];
		for (let i = 0; i < 257; i++) {
			const recipient = await getRandomColdWallet(sandbox);
			payments.push({ amount: BigNumber.make(1000), recipientId: recipient.address });
		}

		const tx = await makeMultiPayment(sandbox, {
			payments,
			sender: randomWallet,
		});

		const result = await addTransactionsToPool(sandbox, [tx]);
		assert.equal(result.accept, []);
		assert.equal(result.invalid, [0]);
		assert.equal(result.errors, {
			0: {
				message: `Invalid transaction data: data/asset/payments must pass "maxMultiPaymentLimit" keyword validation, data must have required property 'signatures', data must have required property 'signatures', data must match a schema in anyOf`,
				type: "ERR_BAD_DATA",
			},
		});
	});

	it("should reject multi payment [invalid amount]", async ({ sandbox, wallets }) => {
		const [sender] = wallets;

		const recipient = await getRandomColdWallet(sandbox);

		const { walletRepository } = sandbox.app.get<Contracts.State.Service>(Identifiers.State.Service).getStore();
		const balance = (await walletRepository.findByPublicKey(sender.publicKey)).getBalance();

		const tx1 = await makeMultiPayment(sandbox, {
			payments: [
				{ amount: balance, recipientId: recipient.address },
				{ amount: BigNumber.ONE, recipientId: recipient.address },
			],
			sender,
		});

		const tx2 = await makeMultiPayment(sandbox, {
			payments: [
				{ amount: BigNumber.ZERO, recipientId: recipient.address },
				{ amount: BigNumber.ONE, recipientId: recipient.address },
			],
			sender,
		});

		const result = await addTransactionsToPool(sandbox, [tx1, tx2]);
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

	it("should reject multi payment [missing payments]", async ({ sandbox, wallets }) => {
		const [sender] = wallets;

		const recipient = await getRandomColdWallet(sandbox);
		const tx0 = await makeMultiPayment(sandbox, {
			callback: async (transaction) => {
				// set amount to 1
				transaction.serialized.fill(1, 58, 59);
			},
			payments: [],
			sender,
		});

		const tx1 = await makeMultiPayment(sandbox, {
			callback: async (transaction) => {
				// set amount to 10
				transaction.serialized.fill(10, 58, 59);
			},
			payments: [{ amount: BigNumber.ONE, recipientId: recipient.address }],
			sender,
		});

		const tx2 = await makeMultiPayment(sandbox, {
			callback: async (transaction) => {
				// set amount to 0
				transaction.serialized.fill(10, 58, 59);
			},
			payments: [
				{ amount: BigNumber.ZERO, recipientId: recipient.address },
				{ amount: BigNumber.ONE, recipientId: recipient.address },
			],
			sender,
		});

		const result = await addTransactionsToPool(sandbox, [tx0, tx1, tx2]);

		assert.equal(result.accept, []);
		assert.equal(result.invalid, [0, 1, 2]);
		assert.equal(result.errors![0].type, "ERR_BAD_DATA");
		assert.equal(result.errors![1].type, "ERR_BAD_DATA");
		assert.equal(result.errors![2].type, "ERR_BAD_DATA");
	});
});
