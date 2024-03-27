import { Contracts, Identifiers } from "@mainsail/contracts";
import { describe, Sandbox } from "@mainsail/test-framework";

import { addTransactionsToPool, makeTransfer } from "./factories.js";
import { setup, shutdown } from "./setup.js";

describe<{
	sandbox: Sandbox;
}>("Consensus", ({ beforeEach, afterEach, it, assert }) => {
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

	it("should broadcast simple transfer", async ({ sandbox }) => {
		const [sender] = wallets;

		const tx = await makeTransfer(sandbox, { sender });

		const result = await addTransactionsToPool(sandbox, [tx]);

		assert.equal(result.accept, [0]);
		assert.equal(result.broadcast, [0]);
	});
});
