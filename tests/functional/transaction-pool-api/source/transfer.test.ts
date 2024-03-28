import { Contracts, Identifiers } from "@mainsail/contracts";
import { describe, Sandbox } from "@mainsail/test-framework";

import { setup, shutdown } from "./setup.js";
import { addTransactionsToPool, isTransactionCommitted, makeTransfer, waitBlock } from "./utils.js";

describe<{
	sandbox: Sandbox;
}>("Transfer", ({ beforeEach, afterEach, it, assert }) => {
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

	it("should accept and commit simple transfer", async ({ sandbox }) => {
		const [sender] = wallets;

		const tx = await makeTransfer(sandbox, { sender });

		const result = await addTransactionsToPool(sandbox, [tx]);
		assert.equal(result.accept, [0]);
		assert.equal(result.broadcast, [0]);

		await waitBlock(sandbox);

		assert.true(await isTransactionCommitted(sandbox, tx));
	});

	it("should not accept simple transfer [invalid fee]", async ({ sandbox }) => {
		const [sender] = wallets;

		const tx = await makeTransfer(sandbox, { sender, fee: "1234" });

		const result = await addTransactionsToPool(sandbox, [tx]);
		assert.equal(result.invalid, [0]);
		assert.equal(result.errors[0].type, "ERR_LOW_FEE");

		await waitBlock(sandbox);
		assert.false(await isTransactionCommitted(sandbox, tx));
	});

	it("should not accept simple transfer [invalid amount]", async ({ sandbox }) => {
		const [sender] = wallets;

		const { walletRepository } = sandbox.app.get<Contracts.State.Service>(Identifiers.State.Service).getStore();
		const balance = (await walletRepository.findByPublicKey(sender.publicKey)).getBalance();

		const tx = await makeTransfer(sandbox, { sender, amount: balance.plus(1) });

		const result = await addTransactionsToPool(sandbox, [tx]);
		assert.equal(result.invalid, [0]);
		assert.equal(result.errors[0].type, "ERR_APPLY");
		assert.equal(result.errors[0].message, `tx ${tx.id} cannot be applied: Insufficient balance in the wallet.`);

		await waitBlock(sandbox);
		assert.false(await isTransactionCommitted(sandbox, tx));
	});

	it("should not accept simple transfer [invalid signature]", async ({ sandbox }) => {
		const [sender] = wallets;

		const tx = await makeTransfer(sandbox, {
			sender,
			signature:
				"8dd7af61d8fa4720bf6388b5d89f8b243587697c6e65e63d2fedf3c8440594366415395075885249a0aab8b6570298491837e364c6c4f9f658c63d4633ea6ff9",
		});

		const result = await addTransactionsToPool(sandbox, [tx]);
		assert.equal(result.invalid, [0]);
		assert.equal(result.errors[0].type, "ERR_BAD_DATA");
		assert.true(result.errors[0].message.includes("didn't pass verification"));

		await waitBlock(sandbox);
		assert.false(await isTransactionCommitted(sandbox, tx));
	});

	it("should not accept simple transfer [malformed signature]", async ({ sandbox }) => {
		const [sender] = wallets;

		const tx = await makeTransfer(sandbox, { sender, signature: "5161a55859e0be86080ca54d9" });

		const result = await addTransactionsToPool(sandbox, [tx]);
		assert.equal(result.invalid, [0]);
		assert.equal(result.errors[0].type, "ERR_BAD_DATA");
		assert.equal(
			result.errors[0].message,
			"Invalid transaction data: Failed to deserialize transaction, encountered invalid bytes: Read over buffer boundary. (length: 64, remaining: 12, diff: 52)",
		);

		await waitBlock(sandbox);
		assert.false(await isTransactionCommitted(sandbox, tx));
	});
});
