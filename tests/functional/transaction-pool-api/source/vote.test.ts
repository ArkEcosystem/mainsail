import { Contracts, Identifiers } from "@mainsail/contracts";
import { describe, Sandbox } from "@mainsail/test-framework";

import { setup, shutdown } from "./setup.js";
import {
	addTransactionsToPool,
	getRandomFundedWallet,
	hasUnvoted,
	hasVotedFor,
	makeValidatorRegistration,
	makeValidatorResignation,
	makeVote,
	waitBlock,
} from "./utils.js";

describe<{
	sandbox: Sandbox;
}>("Vote", ({ beforeEach, afterEach, it, assert }) => {
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

	it("should accept and commit vote", async ({ sandbox }) => {
		const [sender] = wallets;

		const randomWallet = await getRandomFundedWallet(sandbox, sender);

		const tx = await makeVote(sandbox, { sender: randomWallet, voteAsset: wallets[1].publicKey });

		await addTransactionsToPool(sandbox, [tx]);
		await waitBlock(sandbox);

		assert.true(await hasVotedFor(sandbox, randomWallet.publicKey, wallets[1].publicKey));
	});

	it("should accept and commit unvote", async ({ sandbox }) => {
		const [sender] = wallets;

		const randomWallet = await getRandomFundedWallet(sandbox, sender);

		// Vote
		const voteTx = await makeVote(sandbox, { sender: randomWallet, voteAsset: wallets[1].publicKey });
		await addTransactionsToPool(sandbox, [voteTx]);
		await waitBlock(sandbox);
		assert.true(await hasVotedFor(sandbox, randomWallet.publicKey, wallets[1].publicKey));

		// Unvote
		const unvoteTx = await makeVote(sandbox, { sender: randomWallet, unvoteAsset: wallets[1].publicKey });
		await addTransactionsToPool(sandbox, [unvoteTx]);
		await waitBlock(sandbox);

		assert.true(await hasUnvoted(sandbox, randomWallet.publicKey));
	});

	it("should reject vote for non-validator", async ({ sandbox }) => {
		const [sender] = wallets;

		const randomWallet = await getRandomFundedWallet(sandbox, sender);
		const randomWallet2 = await getRandomFundedWallet(sandbox, sender);

		const tx = await makeVote(sandbox, { sender: randomWallet, voteAsset: randomWallet2.publicKey });
		const result = await addTransactionsToPool(sandbox, [tx]);

		assert.equal(result.invalid, [0]);
		assert.equal(result.errors[0].type, "ERR_APPLY");
		assert.equal(
			result.errors[0].message,
			`tx ${tx.id} cannot be applied: Failed to apply transaction, because only validators can be voted.`,
		);
	});

	it("should accept unvote for resigned validator", async ({ sandbox }) => {
		const [sender] = wallets;

		const randomWallet = await getRandomFundedWallet(sandbox, sender);
		const randomWallet2 = await getRandomFundedWallet(sandbox, sender);

		const registrationTx = await makeValidatorRegistration(sandbox, { sender: randomWallet2 });
		await addTransactionsToPool(sandbox, [registrationTx]);
		await waitBlock(sandbox);

		const voteTx = await makeVote(sandbox, { sender: randomWallet, voteAsset: randomWallet2.publicKey });
		await addTransactionsToPool(sandbox, [voteTx]);
		await waitBlock(sandbox);
		assert.true(await hasVotedFor(sandbox, randomWallet.publicKey, randomWallet2.publicKey));

		const resignationTx = await makeValidatorResignation(sandbox, { sender: randomWallet2 });
		await addTransactionsToPool(sandbox, [resignationTx]);
		await waitBlock(sandbox);

		const tx = await makeVote(sandbox, { sender: randomWallet, unvoteAsset: randomWallet2.publicKey });
		await addTransactionsToPool(sandbox, [tx]);
		await waitBlock(sandbox);

		assert.true(await hasUnvoted(sandbox, randomWallet.publicKey));
	});

	it("should reject vote for resigned validator", async ({ sandbox }) => {
		const [sender] = wallets;

		const randomWallet = await getRandomFundedWallet(sandbox, sender);
		const randomWallet2 = await getRandomFundedWallet(sandbox, sender);

		const registrationTx = await makeValidatorRegistration(sandbox, { sender: randomWallet2 });
		await addTransactionsToPool(sandbox, [registrationTx]);
		await waitBlock(sandbox);

		const resignationTx = await makeValidatorResignation(sandbox, { sender: randomWallet2 });
		await addTransactionsToPool(sandbox, [resignationTx]);
		await waitBlock(sandbox);

		const voteTx = await makeVote(sandbox, { sender: randomWallet, voteAsset: randomWallet2.publicKey });

		const result = await addTransactionsToPool(sandbox, [voteTx]);
		assert.equal(result.invalid, [0]);
		assert.equal(result.errors[0].type, "ERR_APPLY");
		assert.equal(
			result.errors[0].message,
			`tx ${voteTx.id} cannot be applied: Failed to apply transaction, because it votes for a resigned validator.`,
		);
	});
});
