import { Contracts, Identifiers } from "@mainsail/contracts";
import { describe, Sandbox } from "@mainsail/test-framework";
import { BigNumber } from "@mainsail/utils";

import { setup, shutdown } from "./setup.js";
import {
	addTransactionsToPool,
	getAddressByPublicKey,
	getRandomColdWallet,
	getRandomFundedWallet,
	hasBalance,
	makeMultiPayment,
	waitBlock,
} from "./utils.js";

describe<{
	sandbox: Sandbox;
}>("MultiPayment", ({ beforeEach, afterEach, it, assert }) => {
	const wallets: Contracts.Crypto.KeyPair[] = [];

	beforeEach(async (context) => {
		context.sandbox = await setup();
		const walletKeyPairFactory = context.sandbox.app.getTagged<Contracts.Crypto.KeyPairFactory>(
			Identifiers.Cryptography.Identity.KeyPair.Factory,
			"type",
			"wallet",
		);
		const secrets = context.sandbox.app.config("validators.secrets");

		wallets.length = 0;
		for (const secret of secrets.values()) {
			const walletKeyPair = await walletKeyPairFactory.fromMnemonic(secret);
			wallets.push(walletKeyPair);
		}
	});

	afterEach(async (context) => shutdown(context.sandbox));

	it("should accept multi payment", async ({ sandbox }) => {
		const [sender] = wallets;

		const randomWallet = await getRandomFundedWallet(sandbox, sender);

		const recipient = await getRandomColdWallet(sandbox);
		const recipient2 = await getRandomColdWallet(sandbox);

		const tx = await makeMultiPayment(sandbox, {
			payments: [
				{ amount: BigNumber.make(1000), recipientId: recipient },
				{ amount: BigNumber.make(1000), recipientId: recipient2 },
			],
			sender: randomWallet,
		});

		await addTransactionsToPool(sandbox, [tx]);
		await waitBlock(sandbox);

		assert.true(await hasBalance(sandbox, recipient, BigNumber.make(1000)));
		assert.true(await hasBalance(sandbox, recipient2, BigNumber.make(1000)));
	});

	it("should accept multi payment with same recipients", async ({ sandbox }) => {
		const [sender] = wallets;

		const randomWallet = await getRandomFundedWallet(sandbox, sender);

		const recipient = await getRandomColdWallet(sandbox);
		const recipient2 = await getRandomColdWallet(sandbox);

		const tx = await makeMultiPayment(sandbox, {
			payments: [
				{ amount: BigNumber.make(1000), recipientId: recipient },
				{ amount: BigNumber.make(1000), recipientId: recipient },
				{ amount: BigNumber.make(1000), recipientId: recipient2 },
			],
			sender: randomWallet,
		});

		await addTransactionsToPool(sandbox, [tx]);
		await waitBlock(sandbox);

		assert.true(await hasBalance(sandbox, recipient, BigNumber.make(2000)));
		assert.true(await hasBalance(sandbox, recipient2, BigNumber.make(1000)));
	});

	it("should accept multi payment to self", async ({ sandbox }) => {
		const [sender] = wallets;

		const randomWallet = await getRandomFundedWallet(sandbox, sender);

		const recipient = await getRandomColdWallet(sandbox);

		const tx = await makeMultiPayment(sandbox, {
			payments: [
				{
					amount: BigNumber.make(1000),
					recipientId: await getAddressByPublicKey(sandbox, randomWallet.publicKey),
				},
				{ amount: BigNumber.make(1000), recipientId: recipient },
			],
			sender: randomWallet,
		});

		await addTransactionsToPool(sandbox, [tx]);
		await waitBlock(sandbox);

		assert.true(await hasBalance(sandbox, recipient, BigNumber.make(1000)));
	});

	it("should accept multi payment with max payments", async ({ sandbox }) => {
		const [sender] = wallets;

		const randomWallet = await getRandomFundedWallet(sandbox, sender);

		const payments: Contracts.Crypto.MultiPaymentItem[] = [];
		for (let i = 0; i < 256; i++) {
			const recipient = await getRandomColdWallet(sandbox);
			payments.push({ amount: BigNumber.make(1000), recipientId: recipient });
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
