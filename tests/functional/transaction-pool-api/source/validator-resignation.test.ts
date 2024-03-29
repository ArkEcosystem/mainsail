import { Contracts, Identifiers } from "@mainsail/contracts";
import { describe, Sandbox } from "@mainsail/test-framework";

import { setup, shutdown } from "./setup.js";
import {
	addTransactionsToPool,
	getRandomFundedWallet,
	hasResigned,
	makeValidatorRegistration,
	makeValidatorResignation,
	waitBlock,
} from "./utils.js";

describe<{
	sandbox: Sandbox;
}>("ValidatorResignation", ({ beforeEach, afterEach, it, assert }) => {
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

	it("should accept validator resignation", async ({ sandbox }) => {
		const [sender] = wallets;

		const randomWallet = await getRandomFundedWallet(sandbox, sender);

		const registrationTx = await makeValidatorRegistration(sandbox, { sender: randomWallet });
		await addTransactionsToPool(sandbox, [registrationTx]);
		await waitBlock(sandbox);
		assert.false(await hasResigned(sandbox, randomWallet.publicKey));

		const resignationTx = await makeValidatorResignation(sandbox, { sender: randomWallet });
		await addTransactionsToPool(sandbox, [resignationTx]);
		await waitBlock(sandbox);

		assert.true(await hasResigned(sandbox, randomWallet.publicKey));
	});

	it("should reject resignation if not enough validators", async ({ sandbox }) => {
		const [sender] = wallets;

		const tx = await makeValidatorResignation(sandbox, { sender });
		const result = await addTransactionsToPool(sandbox, [tx]);

		assert.equal(result.invalid, [0]);
		assert.equal(result.errors[0].type, "ERR_APPLY");
		assert.equal(
			result.errors[0].message,
			`tx ${tx.id} cannot be applied: Failed to apply transaction, because not enough validators to allow resignation.`,
		);
	});

	it("should reject validator resignation if not registered", async ({ sandbox }) => {
		const [sender] = wallets;

		const randomWallet = await getRandomFundedWallet(sandbox, sender);

		const tx = await makeValidatorResignation(sandbox, { sender: randomWallet });

		const result = await addTransactionsToPool(sandbox, [tx]);
		assert.equal(result.invalid, [0]);
		assert.equal(result.errors[0].type, "ERR_APPLY");
		assert.equal(
			result.errors[0].message,
			`tx ${tx.id} cannot be applied: Failed to apply transaction, because the wallet is not a validator.`,
		);
	});

	it("should reject double resignation", async ({ sandbox }) => {
		const [sender] = wallets;

		const randomWallet = await getRandomFundedWallet(sandbox, sender);

		const registrationTx = await makeValidatorRegistration(sandbox, { sender: randomWallet });
		await addTransactionsToPool(sandbox, [registrationTx]);
		await waitBlock(sandbox);
		assert.false(await hasResigned(sandbox, randomWallet.publicKey));

		const resignationTx = await makeValidatorResignation(sandbox, { sender: randomWallet });
		await addTransactionsToPool(sandbox, [resignationTx]);
		await waitBlock(sandbox);

		const resignationTx2 = await makeValidatorResignation(sandbox, { sender: randomWallet });

		const result = await addTransactionsToPool(sandbox, [resignationTx2]);
		assert.equal(result.invalid, [0]);
		assert.equal(result.errors[0].type, "ERR_APPLY");
		assert.equal(
			result.errors[0].message,
			`tx ${resignationTx2.id} cannot be applied: Failed to apply transaction, because the wallet already resigned as validator.`,
		);
	});

	it("should reject registration after resignation", async ({ sandbox }) => {
		const [sender] = wallets;

		const randomWallet = await getRandomFundedWallet(sandbox, sender);

		const registrationTx = await makeValidatorRegistration(sandbox, { sender: randomWallet });
		await addTransactionsToPool(sandbox, [registrationTx]);
		await waitBlock(sandbox);
		assert.false(await hasResigned(sandbox, randomWallet.publicKey));

		const resignationTx = await makeValidatorResignation(sandbox, { sender: randomWallet });
		await addTransactionsToPool(sandbox, [resignationTx]);
		await waitBlock(sandbox);

		const registrationTx2 = await makeValidatorRegistration(sandbox, { sender: randomWallet });

		const result = await addTransactionsToPool(sandbox, [registrationTx2]);
		assert.equal(result.invalid, [0]);
		assert.equal(result.errors[0].type, "ERR_APPLY");
		assert.equal(
			result.errors[0].message,
			`tx ${registrationTx2.id} cannot be applied: Failed to apply transaction, because the wallet is already a validator.`,
		);
	});
});
