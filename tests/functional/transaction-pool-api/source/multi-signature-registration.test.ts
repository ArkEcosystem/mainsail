import { Contracts, Identifiers } from "@mainsail/contracts";
import { describe, Sandbox } from "@mainsail/test-framework";
import { BigNumber } from "@mainsail/utils";

import { setup, shutdown } from "./setup.js";
import {
	addTransactionsToPool,
	getAddressByPublicKey,
	getMultiSignatureWallet,
	getRandomColdWallet,
	getRandomFundedWallet,
	getRandomSignature,
	hasBalance,
	makeMultiPayment,
	makeMultiSignatureRegistration,
	waitBlock,
} from "./utils.js";

describe<{
	sandbox: Sandbox;
}>("MultiSignature", ({ beforeEach, afterEach, it, assert }) => {
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

	it("should accept and process multi signature registration", async ({ sandbox }) => {
		const [sender] = wallets;

		const randomWallet = await getRandomFundedWallet(sandbox, sender);

		const participant1 = await getRandomColdWallet(sandbox);
		const participant2 = await getRandomColdWallet(sandbox);
		const participants = [participant1.keyPair, participant2.keyPair];

		const tx = await makeMultiSignatureRegistration(sandbox, {
			participants,
			sender: randomWallet,
		});

		await addTransactionsToPool(sandbox, [tx]);
		await waitBlock(sandbox);

		const wallet = await getMultiSignatureWallet(sandbox, participants);
		assert.true(wallet.hasMultiSignature());
	});

	it("should reject multi signature registration if already registered", async ({ sandbox }) => {
		const [sender] = wallets;

		const randomWallet = await getRandomFundedWallet(sandbox, sender);

		const participant1 = await getRandomColdWallet(sandbox);
		const participant2 = await getRandomColdWallet(sandbox);
		const participants = [participant1.keyPair, participant2.keyPair];

		const registrationTx1 = await makeMultiSignatureRegistration(sandbox, {
			participants,
			sender: randomWallet,
		});
		await addTransactionsToPool(sandbox, [registrationTx1]);
		await waitBlock(sandbox);

		const registrationTx2 = await makeMultiSignatureRegistration(sandbox, {
			participants,
			sender: randomWallet,
		});
		const result = await addTransactionsToPool(sandbox, [registrationTx2]);
		assert.equal(result.invalid, [0]);
		assert.equal(result.errors[0].type, "ERR_APPLY");
		assert.equal(
			result.errors[0].message,
			`tx ${registrationTx2.id} cannot be applied: Failed to apply transaction, because multi signature is already enabled.`,
		);
	});

	it("should reject multi signature registration if any signature invalid", async ({ sandbox }) => {
		const [sender] = wallets;

		const randomWallet = await getRandomFundedWallet(sandbox, sender);

		const participant1 = await getRandomColdWallet(sandbox);
		const participant2 = await getRandomColdWallet(sandbox);
		const participants = [participant1.keyPair, participant2.keyPair];

		const tx = await makeMultiSignatureRegistration(sandbox, {
			participantSignatureOverwrite: {
				0: `00${await getRandomSignature(sandbox)}`,
			},
			participants,
			sender: randomWallet,
		});
		const result = await addTransactionsToPool(sandbox, [tx]);
		assert.equal(result.invalid, [0]);
		assert.equal(result.errors[0].type, "ERR_APPLY");
		assert.equal(
			result.errors[0].message,
			`tx ${tx.id} cannot be applied: Failed to apply transaction, because the multi signature could not be verified.`,
		);
	});
});
