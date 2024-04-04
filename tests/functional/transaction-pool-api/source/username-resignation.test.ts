import { Contracts } from "@mainsail/contracts";
import { describe, Sandbox } from "@mainsail/test-framework";
import { UsernameResignations } from "@mainsail/test-transaction-builders";

import { setup, shutdown } from "./setup.js";
import { Snapshot, takeSnapshot } from "./snapshot.js";
import { addTransactionsToPool, getWallets, hasUsername, waitBlock } from "./utils.js";

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

	it("should accept username resignation", async (context) => {
		const [registrationTx, resignationTx] = await UsernameResignations.makeValidUsernameResignation(context);

		await addTransactionsToPool(context, [registrationTx]);
		await waitBlock(context);
		assert.true(await hasUsername(context, registrationTx.data.senderPublicKey));

		await addTransactionsToPool(context, [resignationTx]);
		await waitBlock(context);
		assert.false(await hasUsername(context, registrationTx.data.senderPublicKey));
	});

	it("should reject username resignation without a username", async (context) => {
		const resignationTx = await UsernameResignations.makeInvalidUsernameResignationWithoutUsername(context);
		const result = await addTransactionsToPool(context, [resignationTx]);
		assert.equal(result.invalid, [0]);
		assert.equal(result.errors, {
			0: {
				message: `tx ${resignationTx.id} cannot be applied: Failed to apply transaction, because the username is not registered.`,
				type: "ERR_APPLY",
			},
		});
	});

	it("should only accept one username resignation per sender in pool at the same time", async (context) => {
		const [registrationTx, resignationTx1, resignationTx2] =
			await UsernameResignations.makeDuplicateUsernameResignation(context);

		await addTransactionsToPool(context, [registrationTx]);
		await waitBlock(context);

		// Submit 2 resignations, but only one will be accepted
		const result = await addTransactionsToPool(context, [resignationTx1, resignationTx2]);

		assert.equal(result.accept, [0]);
		assert.equal(result.invalid, [1]);
		assert.equal(result.errors, {
			1: {
				message: `tx ${resignationTx2.id} cannot be applied: Sender ${registrationTx.data.senderPublicKey} already has a transaction of type '9' in the pool`,
				type: "ERR_APPLY",
			},
		});
	});
});
