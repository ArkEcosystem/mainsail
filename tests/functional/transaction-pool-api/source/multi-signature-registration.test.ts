import { Contracts } from "@mainsail/contracts";
import { describe, Sandbox } from "@mainsail/test-framework";

import { setup, shutdown } from "./setup.js";
import { Snapshot, takeSnapshot } from "./snapshot.js";
import {
	addTransactionsToPool,
	getMultiSignatureWallet,
	getRandomColdWallet,
	getRandomFundedWallet,
	getRandomSignature,
	getWallets,
	makeMultiSignatureRegistration,
	waitBlock,
} from "./utils.js";

describe<{
	sandbox: Sandbox;
	snapshot: Snapshot;
	wallets: Contracts.Crypto.KeyPair[];
}>("MultiSignature", ({ beforeEach, afterEach, it, assert }) => {
	beforeEach(async (context) => {
		context.sandbox = await setup();
		context.wallets = await getWallets(context.sandbox);
		context.snapshot = await takeSnapshot(context.sandbox);
	});

	afterEach(async ({ sandbox, snapshot }) => {
		await snapshot.validate();

		await shutdown(sandbox);
	});

	it("should accept and process multi signature registration", async ({ sandbox, wallets }) => {
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

	it("should reject multi signature registration if already registered", async ({ sandbox, wallets }) => {
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
		assert.equal(result.errors, {
			0: {
				message: `tx ${registrationTx2.id} cannot be applied: Failed to apply transaction, because multi signature is already enabled.`,
				type: "ERR_APPLY",
			},
		});
	});

	it("should reject multi signature registration if any signature invalid", async ({ sandbox, wallets }) => {
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
		assert.equal(result.errors, {
			0: {
				message: `tx ${tx.id} cannot be applied: Failed to apply transaction, because the multi signature could not be verified.`,
				type: "ERR_APPLY",
			},
		});
	});
});
