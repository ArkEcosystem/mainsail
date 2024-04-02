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
}>("UsernameRegistration", ({ beforeEach, afterEach, it, assert }) => {
	beforeEach(async (context) => {
		context.sandbox = await setup();
		context.wallets = await getWallets(context.sandbox);
		context.snapshot = await takeSnapshot(context.sandbox);
	});

	afterEach(async ({ sandbox, snapshot }) => {
		await snapshot.validate();

		await shutdown(sandbox);
	});

	it("should accept username registration", async ({ sandbox, wallets }) => {
		const [sender] = wallets;

		const randomWallet = await getRandomFundedWallet(sandbox, sender);

		const username = "randomvalidator";
		const registrationTx = await makeUsernameRegistration(sandbox, { sender: randomWallet, username });
		await addTransactionsToPool(sandbox, [registrationTx]);
		await waitBlock(sandbox);
		assert.true(await hasUsername(sandbox, randomWallet.publicKey, username));
	});

	it("should accept username change", async ({ sandbox, wallets }) => {
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

	it("should reject username registration if already used", async ({ sandbox, wallets }) => {
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
		assert.equal(result.errors, {
			0: {
				message: `tx ${registrationTx2.id} cannot be applied: Failed to apply transaction, because the username '${username}' is already registered.`,
				type: "ERR_APPLY",
			},
		});
	});

	it("should make resigned username available again", async ({ sandbox, wallets }) => {
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

	it("should only accept one username registration per sender in pool at the same time", async ({
		sandbox,
		wallets,
	}) => {
		const [validator1] = wallets;

		const randomWallet = await getRandomFundedWallet(sandbox, validator1);

		// Submit 2 registrations, but only one will be accepted
		const registrationTx1 = await makeUsernameRegistration(sandbox, {
			nonceOffset: 0,
			sender: randomWallet,
		});

		const registrationTx2 = await makeUsernameRegistration(sandbox, {
			nonceOffset: 1,
			sender: randomWallet,
		});
		const result = await addTransactionsToPool(sandbox, [registrationTx1, registrationTx2]);
		await waitBlock(sandbox);

		assert.equal(result.accept, [0]);
		assert.equal(result.invalid, [1]);
		assert.equal(result.errors, {
			1: {
				message: `tx ${registrationTx2.id} cannot be applied: Sender ${randomWallet.publicKey} already has a transaction of type '8' in the pool`,
				type: "ERR_APPLY",
			},
		});
	});

	it("should reject duplicate username in pool", async ({ sandbox, wallets }) => {
		const [validator1] = wallets;

		const randomWallet1 = await getRandomFundedWallet(sandbox, validator1);
		const randomWallet2 = await getRandomFundedWallet(sandbox, validator1);

		const username = "bob";

		// Submit 2 registration from different wallets using same username
		const registrationTx1 = await makeUsernameRegistration(sandbox, {
			nonceOffset: 0,
			sender: randomWallet1,
			username,
		});

		const registrationTx2 = await makeUsernameRegistration(sandbox, {
			nonceOffset: 1,
			sender: randomWallet2,
			username,
		});
		const result = await addTransactionsToPool(sandbox, [registrationTx1, registrationTx2]);
		await waitBlock(sandbox);

		assert.equal(result.accept, [0]);
		assert.equal(result.invalid, [1]);
		assert.equal(result.errors, {
			1: {
				message: `tx ${registrationTx2.id} cannot be applied: Username registration for username "${username}" already in the pool`,
				type: "ERR_APPLY",
			},
		});
	});
});
