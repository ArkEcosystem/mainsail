import { Contracts } from "@mainsail/contracts";
import { describe, Sandbox } from "@mainsail/test-framework";

import { setup, shutdown } from "./setup.js";
import { Snapshot, takeSnapshot } from "./snapshot.js";
import {
	addTransactionsToPool,
	getRandomFundedWallet,
	getWallets,
	hasUsername,
	makeUsernameRegistration,
	makeUsernameResignation,
	waitBlock,
} from "./utils.js";

describe<{
	sandbox: Sandbox;
	snapshot: Snapshot;
	wallets: Contracts.Crypto.KeyPair[];
}>("UsernameResignation", ({ beforeEach, afterEach, it, assert }) => {
	beforeEach(async (context) => {
		context.sandbox = await setup();
		context.wallets = await getWallets(context.sandbox);
		context.snapshot = await takeSnapshot(context.sandbox);
	});

	afterEach(async ({ sandbox, snapshot }) => {
		await snapshot.validate();

		await shutdown(sandbox);
	});

	it("should accept username resignation", async ({ sandbox, wallets }) => {
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

	it("should reject username resignation without a username", async ({ sandbox, wallets }) => {
		const [sender] = wallets;

		const randomWallet = await getRandomFundedWallet(sandbox, sender);

		const resignationTx = await makeUsernameResignation(sandbox, { sender: randomWallet });
		const result = await addTransactionsToPool(sandbox, [resignationTx]);
		assert.equal(result.invalid, [0]);
		assert.equal(result.errors, {
			0: {
				message: `tx ${resignationTx.id} cannot be applied: Failed to apply transaction, because the username is not registered.`,
				type: "ERR_APPLY",
			},
		});
	});

	it("should only accept one username resignation per sender in pool at the same time", async ({
		sandbox,
		wallets,
	}) => {
		const [validator1] = wallets;

		const randomWallet = await getRandomFundedWallet(sandbox, validator1);
		const registrationTx = await makeUsernameRegistration(sandbox, {
			sender: randomWallet,
		});
		await addTransactionsToPool(sandbox, [registrationTx]);
		await waitBlock(sandbox);

		// Submit 2 resignations, but only one will be accepted
		const resignationTx1 = await makeUsernameResignation(sandbox, {
			nonceOffset: 0,
			sender: randomWallet,
		});

		const resignationTx2 = await makeUsernameResignation(sandbox, {
			nonceOffset: 1,
			sender: randomWallet,
		});
		const result = await addTransactionsToPool(sandbox, [resignationTx1, resignationTx2]);

		assert.equal(result.accept, [0]);
		assert.equal(result.invalid, [1]);
		assert.equal(result.errors, {
			1: {
				message: `tx ${resignationTx2.id} cannot be applied: Sender ${randomWallet.publicKey} already has a transaction of type '9' in the pool`,
				type: "ERR_APPLY",
			},
		});
	});
});
