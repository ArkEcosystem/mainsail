import { Contracts } from "@mainsail/contracts";
import { describe, Sandbox } from "@mainsail/test-framework";
import { UsernameRegistrations } from "@mainsail/test-transaction-builders";

import { setup, shutdown } from "./setup.js";
import { Snapshot, takeSnapshot } from "./snapshot.js";
import { addTransactionsToPool, getWalletByAddressOrPublicKey, getWallets, hasUsername, waitBlock } from "./utils.js";

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

	it("should accept username registration", async (context) => {
		const username = "randomvalidator";
		const registrationTx = await UsernameRegistrations.makeUsernameRegistration(context, { username });

		await addTransactionsToPool(context, [registrationTx]);
		await waitBlock(context);
		assert.true(await hasUsername(context, registrationTx.data.senderPublicKey, username));
	});

	it("should accept username change", async (context) => {
		const [registrationTx1, registrationTx2] =
			await UsernameRegistrations.makeValidUsernameRegistrationChange(context);

		await addTransactionsToPool(context, [registrationTx1]);
		await waitBlock(context);
		assert.true(await hasUsername(context, registrationTx1.data.senderPublicKey));

		await addTransactionsToPool(context, [registrationTx2]);
		await waitBlock(context);
		assert.true(await hasUsername(context, registrationTx1.data.senderPublicKey));
	});

	it("should reject username registration if already used", async (context) => {
		const [registrationTx1, registrationTx2] =
			await UsernameRegistrations.makeInvalidDuplicateUsernameRegistration(context);

		await addTransactionsToPool(context, [registrationTx1]);
		await waitBlock(context);
		assert.true(await hasUsername(context, registrationTx1.data.senderPublicKey));

		const wallet = await getWalletByAddressOrPublicKey(context, registrationTx1.data.senderPublicKey);

		const result = await addTransactionsToPool(context, [registrationTx2]);
		assert.equal(result.invalid, [0]);
		assert.equal(result.errors, {
			0: {
				message: `tx ${registrationTx2.id} cannot be applied: Failed to apply transaction, because the username '${wallet.getAttribute("username")}' is already registered.`,
				type: "ERR_APPLY",
			},
		});
	});

	it("should make resigned username available again", async (context) => {
		const [registrationTx1, resignationTx, registrationTx2] =
			await UsernameRegistrations.makeUsernameRegistrationReusePreviouslyResigned(context);

		await addTransactionsToPool(context, [registrationTx1]);
		await waitBlock(context);
		assert.true(await hasUsername(context, registrationTx1.data.senderPublicKey));

		const previousUsername = (
			await getWalletByAddressOrPublicKey(context, registrationTx1.data.senderPublicKey)
		).getAttribute("username");

		await addTransactionsToPool(context, [resignationTx]);
		await waitBlock(context);

		assert.false(await hasUsername(context, registrationTx1.data.senderPublicKey));

		await addTransactionsToPool(context, [registrationTx2]);
		await waitBlock(context);
		assert.true(await hasUsername(context, registrationTx2.data.senderPublicKey, previousUsername));
	});

	it("should only accept one username registration per sender in pool at the same time", async (context) => {
		// Submit 2 registrations, but only one will be accepted
		const registrationTx1 = await UsernameRegistrations.makeUsernameRegistration(context, {
			nonceOffset: 0,
		});

		const registrationTx2 = await UsernameRegistrations.makeUsernameRegistration(context, {
			nonceOffset: 1,
		});
		const result = await addTransactionsToPool(context, [registrationTx1, registrationTx2]);
		await waitBlock(context);

		assert.equal(result.accept, [0]);
		assert.equal(result.invalid, [1]);
		assert.equal(result.errors, {
			1: {
				message: `tx ${registrationTx2.id} cannot be applied: Sender ${registrationTx1.data.senderPublicKey} already has a transaction of type '8' in the pool`,
				type: "ERR_APPLY",
			},
		});
	});

	it("should reject duplicate username in pool", async (context) => {
		// Submit 2 registration from different wallets using same username
		const username = "bob";
		const [registrationTx1, registrationTx2] = await UsernameRegistrations.makeInvalidDuplicateUsernameRegistration(
			context,
			{ username },
		);

		const result = await addTransactionsToPool(context, [registrationTx1, registrationTx2]);
		await waitBlock(context);

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
