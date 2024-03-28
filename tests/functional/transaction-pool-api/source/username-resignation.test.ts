import { Contracts, Identifiers } from "@mainsail/contracts";
import { describe, Sandbox } from "@mainsail/test-framework";

import { setup, shutdown } from "./setup.js";
import {
	addTransactionsToPool,
	getRandomFundedWallet,
	hasUsername,
	makeUsernameRegistration,
	makeUsernameResignation,
	waitBlock,
} from "./utils.js";

describe<{
	sandbox: Sandbox;
}>("UsernameResignation", ({ beforeEach, afterEach, it, assert }) => {
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

	it("should accept username resignation", async ({ sandbox }) => {
		const [sender] = wallets;

		const randomWallet = await getRandomFundedWallet(sandbox, sender);

		const registrationTx = await makeUsernameRegistration(sandbox, { sender: randomWallet });
		await addTransactionsToPool(sandbox, [registrationTx]);
		await waitBlock(sandbox);
		assert.true(await hasUsername(sandbox, randomWallet.publicKey));

		const resignationTx = await makeUsernameResignation(sandbox, { sender: randomWallet });
		await addTransactionsToPool(sandbox, [resignationTx]);
		await waitBlock(sandbox);
		assert.false(await hasUsername(sandbox, randomWallet.publicKey));
	});

	it("should reject username resignation without a username", async ({ sandbox }) => {
		const [sender] = wallets;

		const randomWallet = await getRandomFundedWallet(sandbox, sender);

		const resignationTx = await makeUsernameResignation(sandbox, { sender: randomWallet });
		const result = await addTransactionsToPool(sandbox, [resignationTx]);
		assert.equal(result.invalid, [0]);
		assert.equal(result.errors[0].type, "ERR_APPLY");
		assert.equal(
			result.errors[0].message,
			`tx ${resignationTx.id} cannot be applied: Failed to apply transaction, because the username is not registered.`,
		);
	});
});
