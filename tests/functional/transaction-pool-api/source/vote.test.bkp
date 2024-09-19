import { Contracts } from "@mainsail/contracts";
import { describe, Sandbox } from "@mainsail/test-framework";
import { Votes } from "@mainsail/test-transaction-builders";

import { setup, shutdown } from "./setup.js";
import { Snapshot, takeSnapshot } from "./snapshot.js";
import {
	addTransactionsToPool,
	getRandomFundedWallet,
	getWallets,
	hasUnvoted,
	hasVotedFor,
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

	it("should accept and commit vote", async (context) => {
		const tx = await Votes.makeValidVote(context);

		await addTransactionsToPool(context, [tx]);
		await waitBlock(context);

		assert.true(await hasVotedFor(context, tx.data.senderPublicKey, tx.data.asset!.votes![0]));
	});

	it("should accept and commit unvote", async (context) => {
		const [voteTx, unvoteTx] = await Votes.makeValidVoteAndUnvote(context);

		// Vote
		await addTransactionsToPool(context, [voteTx]);
		await waitBlock(context);
		assert.true(await hasVotedFor(context, voteTx.data.senderPublicKey, voteTx.data.asset!.votes![0]));

		// Unvote
		await addTransactionsToPool(context, [unvoteTx]);
		await waitBlock(context);

		assert.true(await hasUnvoted(context, voteTx.data.senderPublicKey));
	});

	it("should reject vote for non-validator", async (context) => {
		const tx = await Votes.makeInvalidVoteForNonValidator(context);
		const result = await addTransactionsToPool(context, [tx]);

		assert.equal(result.invalid, [0]);
		assert.equal(result.errors, {
			0: {
				message: `tx ${tx.id} cannot be applied: Failed to apply transaction, because only validators can be voted.`,
				type: "ERR_APPLY",
			},
		});
	});

	it("should accept unvote for resigned validator", async (context) => {
		const [registrationTx, voteTx, resignationTx, unvoteTx] = await Votes.makeUnvoteForResignedValidator(context);
		await addTransactionsToPool(context, [registrationTx]);
		await waitBlock(context);

		await addTransactionsToPool(context, [voteTx]);
		await waitBlock(context);
		assert.true(await hasVotedFor(context, voteTx.data.senderPublicKey, voteTx.data.asset!.votes![0]));

		await addTransactionsToPool(context, [resignationTx]);
		await waitBlock(context);

		await addTransactionsToPool(context, [unvoteTx]);
		await waitBlock(context);

		assert.true(await hasUnvoted(context, voteTx.data.senderPublicKey));
	});

	it("should reject unvote for non voted validator", async (context) => {
		const unvoteTx = await Votes.makeInvalidUnvoteForNonValidator(context);
		const result = await addTransactionsToPool(context, [unvoteTx]);
		assert.equal(result.invalid, [0]);
		assert.equal(result.errors, {
			0: {
				message: `tx ${unvoteTx.id} cannot be applied: Failed to apply transaction, because the wallet has not voted.`,
				type: "ERR_APPLY",
			},
		});
	});

	it("should accept vote switch", async (context) => {
		const [voteTx, switchVoteTx] = await Votes.makeValidVoteSwitch(context);

		// Vote for validator1
		await addTransactionsToPool(context, [voteTx]);
		await waitBlock(context);
		assert.true(await hasVotedFor(context, voteTx.data.senderPublicKey, voteTx.data.asset!.votes![0]));

		// Unvote validator1 and vote for validator2
		const result = await addTransactionsToPool(context, [switchVoteTx]);
		assert.equal(result.accept, [0]);
		await waitBlock(context);
		assert.true(await hasVotedFor(context, switchVoteTx.data.senderPublicKey, switchVoteTx.data.asset!.votes![0]));
	});

	it("should reject switch vote for non voted validator", async (context) => {
		const [voteTx, unvoteTx] = await Votes.makeInvalidVoteSwitchForNonVotedValidator(context);

		// Vote for validator1
		await addTransactionsToPool(context, [voteTx]);
		await waitBlock(context);

		// Provoke unvote mismatch by unvoting the non voted validator 2
		const result = await addTransactionsToPool(context, [unvoteTx]);
		assert.equal(result.invalid, [0]);
		assert.equal(result.errors, {
			0: {
				message: `tx ${unvoteTx.id} cannot be applied: Failed to apply transaction, because the wallet vote does not match.`,
				type: "ERR_APPLY",
			},
		});
	});

	it("should reject vote for resigned validator", async (context) => {
		const [registrationTx, resignationTx, voteTx] = await Votes.makeInvalidVoteForResignedValidator(context);

		await addTransactionsToPool(context, [registrationTx]);
		await waitBlock(context);

		await addTransactionsToPool(context, [resignationTx]);
		await waitBlock(context);

		const result = await addTransactionsToPool(context, [voteTx]);
		assert.equal(result.invalid, [0]);
		assert.equal(result.errors, {
			0: {
				message: `tx ${voteTx.id} cannot be applied: Failed to apply transaction, because it votes for a resigned validator.`,
				type: "ERR_APPLY",
			},
		});
	});

	it("should only accept one vote per sender in pool at the same time", async (context) => {
		const { wallets } = context;
		const [validator1, validator2] = wallets;

		const randomWallet = await getRandomFundedWallet(context, validator1);

		const voteForValidator1Tx = await Votes.makeVote(context, {
			nonceOffset: 0,
			sender: randomWallet,
			voteAsset: validator1.publicKey,
		});

		const voteForValidator1TxDuplicate = await Votes.makeVote(context, {
			nonceOffset: 1,
			sender: randomWallet,
			voteAsset: validator1.publicKey,
		});

		const voteForValidator2Tx = await Votes.makeVote(context, {
			nonceOffset: 2,
			sender: randomWallet,
			voteAsset: validator2.publicKey,
		});

		// Only accepts first vote
		const result = await addTransactionsToPool(context, [
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

	it("should reject vote when already voted", async (context) => {
		const [voteForValidator1Tx, voteForValidator2Tx] = await Votes.makeInvalidDoubleVote(context);

		let result = await addTransactionsToPool(context, [voteForValidator1Tx]);
		assert.equal(result.accept, [0]);
		await waitBlock(context);

		result = await addTransactionsToPool(context, [voteForValidator2Tx]);
		assert.equal(result.invalid, [0]);
		assert.equal(result.errors, {
			0: {
				message: `tx ${voteForValidator2Tx.id} cannot be applied: Failed to apply transaction, because the sender wallet has already voted.`,
				type: "ERR_APPLY",
			},
		});
	});
});
