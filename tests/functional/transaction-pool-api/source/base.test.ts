import { Contracts, Identifiers } from "@mainsail/contracts";
import { describe, Sandbox } from "@mainsail/test-framework";

import { setup, shutdown } from "./setup.js";
import { addTransactionsToPool, assertTransactionCommitted, makeTransfer, waitUntilBlock } from "./utils.js";

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

	it("should accept and commit simple transfer", async ({ sandbox }) => {
		const [sender] = wallets;

		const tx = await makeTransfer(sandbox, { sender });

		const state = sandbox.app.get<Contracts.State.Service>(Identifiers.State.Service);
		const currentHeight = state.getStore().getLastHeight();

		const expectedHeight = currentHeight + 1;

		const result = await addTransactionsToPool(sandbox, [tx]);
		assert.equal(result.accept, [0]);
		assert.equal(result.broadcast, [0]);

		await waitUntilBlock(sandbox, expectedHeight);

		const found = await assertTransactionCommitted(sandbox, expectedHeight, tx);

		assert.true(found);
	});

	it("should not accept simple transfer [invalid fee]", async ({ sandbox }) => {
		const [sender] = wallets;

		const tx = await makeTransfer(sandbox, { sender, fee: "1234" });

		const result = await addTransactionsToPool(sandbox, [tx]);
		assert.equal(result.invalid, [0]);
		assert.equal(result.errors[0].type, "ERR_LOW_FEE");
	});
});

// TODO: bind event dispatcher
// const events = sandbox.app.get<Contracts.Kernel.EventDispatcher>(Identifiers.Services.EventDispatcher.Service);
// const waitForBlock = async (): Promise<Contracts.Crypto.Commit> =>
// 	new Promise((resolve, reject) => {
// 		events.listen(Enums.BlockEvent.Applied, {
// 			handle: ({ name, data }: { name: Contracts.Kernel.EventName; data: Contracts.Crypto.Commit }) => {
// 				console.log(name, data);
// 				resolve(data);
// 			},
// 		});
// 	});
