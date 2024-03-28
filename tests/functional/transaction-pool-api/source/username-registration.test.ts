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
}>("UsernameRegistration", ({ beforeEach, afterEach, it, assert }) => {
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

	it("should accept username registration", async ({ sandbox }) => {
		const [sender] = wallets;

		const randomWallet = await getRandomFundedWallet(sandbox, sender);

		const username = "randomvalidator";
		const registrationTx = await makeUsernameRegistration(sandbox, { sender: randomWallet, username });
		await addTransactionsToPool(sandbox, [registrationTx]);
		await waitBlock(sandbox);
		assert.true(await hasUsername(sandbox, randomWallet.publicKey, username));
	});

	it("should accept username change", async ({ sandbox }) => {
		const [sender] = wallets;

		const randomWallet = await getRandomFundedWallet(sandbox, sender);

		const username = "randomvalidator1";
		const registrationTx = await makeUsernameRegistration(sandbox, { sender: randomWallet, username });
		await addTransactionsToPool(sandbox, [registrationTx]);
		await waitBlock(sandbox);
		assert.true(await hasUsername(sandbox, randomWallet.publicKey));

		const username2 = "randomvalidator2";
		const registrationTx2 = await makeUsernameRegistration(sandbox, { sender: randomWallet, username: username2 });
		await addTransactionsToPool(sandbox, [registrationTx2]);
		await waitBlock(sandbox);
		assert.true(await hasUsername(sandbox, randomWallet.publicKey));
	});

	it("should reject username registration if already used", async ({ sandbox }) => {
		const [sender] = wallets;

		const randomWallet = await getRandomFundedWallet(sandbox, sender);
		const randomWallet2 = await getRandomFundedWallet(sandbox, sender);

		const username = "randomvalidator";
		const registrationTx = await makeUsernameRegistration(sandbox, { sender: randomWallet, username });
		await addTransactionsToPool(sandbox, [registrationTx]);
		await waitBlock(sandbox);
		assert.true(await hasUsername(sandbox, randomWallet.publicKey, username));

		const registrationTx2 = await makeUsernameRegistration(sandbox, { sender: randomWallet2, username });
		const result = await addTransactionsToPool(sandbox, [registrationTx2]);
		assert.equal(result.invalid, [0]);
		assert.equal(result.errors[0].type, "ERR_APPLY");
		assert.equal(
			result.errors[0].message,
			`tx ${registrationTx2.id} cannot be applied: Failed to apply transaction, because the username '${username}' is already registered.`,
		);
	});

	it("should make resigned username available again", async ({ sandbox }) => {
		const [sender] = wallets;

		const randomWallet = await getRandomFundedWallet(sandbox, sender);
		const randomWallet2 = await getRandomFundedWallet(sandbox, sender);

		const username = "randomvalidator";
		const registrationTx = await makeUsernameRegistration(sandbox, { sender: randomWallet, username });
		await addTransactionsToPool(sandbox, [registrationTx]);
		await waitBlock(sandbox);
		assert.true(await hasUsername(sandbox, randomWallet.publicKey, username));

		const resignationTx = await makeUsernameResignation(sandbox, { sender: randomWallet });
		await addTransactionsToPool(sandbox, [resignationTx]);
		await waitBlock(sandbox);
		assert.false(await hasUsername(sandbox, randomWallet.publicKey));

		const registrationTx2 = await makeUsernameRegistration(sandbox, { sender: randomWallet2, username });
		await addTransactionsToPool(sandbox, [registrationTx2]);
		await waitBlock(sandbox);
		assert.true(await hasUsername(sandbox, randomWallet2.publicKey, username));
	});
});
