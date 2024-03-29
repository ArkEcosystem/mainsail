import { Contracts } from "@mainsail/contracts";
import { describe, Sandbox } from "@mainsail/test-framework";

import { setup, shutdown } from "./setup.js";
import { Snapshot, takeSnapshot } from "./snapshot.js";
import {
	addTransactionsToPool,
	getRandomFundedWallet,
	getWallets,
	hasUnvoted,
	hasVotedFor,
	makeValidatorRegistration,
	makeValidatorResignation,
	makeVote,
	waitBlock,
} from "./utils.js";

describe<{
	sandbox: Sandbox;
	snapshot: Snapshot;
	wallets: Contracts.Crypto.KeyPair[];
}>("Vote", ({ beforeEach, afterEach, it, assert }) => {
	beforeEach(async (context) => {
		context.sandbox = await setup();
		context.wallets = await getWallets(context.sandbox);
		context.snapshot = await takeSnapshot(context.sandbox);
	});

	afterEach(async ({ sandbox, snapshot }) => {
		await snapshot.validate();

		await shutdown(sandbox);
	});

	it("should accept and commit vote", async ({ sandbox, wallets }) => {
		const [sender] = wallets;

		const randomWallet = await getRandomFundedWallet(sandbox, sender);

		const tx = await makeVote(sandbox, { sender: randomWallet, voteAsset: wallets[1].publicKey });

		await addTransactionsToPool(sandbox, [tx]);
		await waitBlock(sandbox);

		assert.true(await hasVotedFor(sandbox, randomWallet.publicKey, wallets[1].publicKey));
	});

	it("should accept and commit unvote", async ({ sandbox, wallets }) => {
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

	it("should reject vote for non-validator", async ({ sandbox, wallets }) => {
		const [sender] = wallets;

		const randomWallet = await getRandomFundedWallet(sandbox, sender);
		const randomWallet2 = await getRandomFundedWallet(sandbox, sender);

		const tx = await makeVote(sandbox, { sender: randomWallet, voteAsset: randomWallet2.publicKey });
		const result = await addTransactionsToPool(sandbox, [tx]);

		assert.equal(result.invalid, [0]);
		assert.equal(result.errors, {
			0: {
				message: `tx ${tx.id} cannot be applied: Failed to apply transaction, because only validators can be voted.`,
				type: "ERR_APPLY",
			},
		});
	});

	it("should accept unvote for resigned validator", async ({ sandbox, wallets }) => {
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

	it("should reject vote for resigned validator", async ({ sandbox, wallets }) => {
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
		assert.equal(result.errors, {
			0: {
				message: `tx ${voteTx.id} cannot be applied: Failed to apply transaction, because it votes for a resigned validator.`,
				type: "ERR_APPLY",
			},
		});
	});

	it("should only accept one vote per sender in pool at the same time", async ({ sandbox, wallets }) => {
		const [validator1, validator2] = wallets;

		const randomWallet = await getRandomFundedWallet(sandbox, validator1);

		const voteForValidator1Tx = await makeVote(sandbox, {
			nonceOffset: 0,
			sender: randomWallet,
			voteAsset: validator1.publicKey,
		});

		const voteForValidator1TxDuplicate = await makeVote(sandbox, {
			nonceOffset: 1,
			sender: randomWallet,
			voteAsset: validator1.publicKey,
		});

		const voteForValidator2Tx = await makeVote(sandbox, {
			nonceOffset: 2,
			sender: randomWallet,
			voteAsset: validator2.publicKey,
		});

		// Only accepts first vote
		const result = await addTransactionsToPool(sandbox, [
			voteForValidator1Tx,
			voteForValidator1TxDuplicate,
			voteForValidator2Tx,
		]);
		assert.equal(result.accept, [0]);
		assert.equal(result.invalid, [1, 2]);
		assert.equal(result.errors, {
			1: {
				message: `tx ${voteForValidator1TxDuplicate.id} cannot be applied: Sender ${randomWallet.publicKey} already has a transaction of type '3' in the pool`,
				type: "ERR_APPLY",
			},
			2: {
				message: `tx ${voteForValidator2Tx.id} cannot be applied: Sender ${randomWallet.publicKey} already has a transaction of type '3' in the pool`,
				type: "ERR_APPLY",
			},
		});
	});

	it("should reject vote when already voted", async ({ sandbox, wallets }) => {
		const [validator1, validator2] = wallets;

		const randomWallet = await getRandomFundedWallet(sandbox, validator1);

		const voteForValidator1Tx = await makeVote(sandbox, {
			nonceOffset: 0,
			sender: randomWallet,
			voteAsset: validator1.publicKey,
		});

		const voteForValidator2Tx = await makeVote(sandbox, {
			nonceOffset: 1,
			sender: randomWallet,
			voteAsset: validator2.publicKey,
		});

		let result = await addTransactionsToPool(sandbox, [voteForValidator1Tx]);
		assert.equal(result.accept, [0]);
		await waitBlock(sandbox);

		result = await addTransactionsToPool(sandbox, [voteForValidator2Tx]);
		assert.equal(result.invalid, [0]);
		assert.equal(result.errors, {
			0: {
				message: `tx ${voteForValidator2Tx.id} cannot be applied: Failed to apply transaction, because the sender wallet has already voted.`,
				type: "ERR_APPLY",
			},
		});
	});
});
