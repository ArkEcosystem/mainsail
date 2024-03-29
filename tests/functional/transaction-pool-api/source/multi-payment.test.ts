import { Contracts } from "@mainsail/contracts";
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
});
