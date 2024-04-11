import { Contracts } from "@mainsail/contracts";
import { describe, Sandbox } from "@mainsail/test-framework";
import { ValidatorRegistrations, ValidatorResignations } from "@mainsail/test-transaction-builders";

import { setup, shutdown } from "./setup.js";
import { Snapshot, takeSnapshot } from "./snapshot.js";
import { addTransactionsToPool, getRandomFundedWallet, getWallets, hasResigned, waitBlock } from "./utils.js";

describe<{
	sandbox: Sandbox;
	snapshot: Snapshot;
	wallets: Contracts.Crypto.KeyPair[];
}>("ValidatorResignation", ({ beforeEach, afterEach, it, assert }) => {
	beforeEach(async (context) => {
		context.sandbox = await setup();
		context.wallets = await getWallets(context.sandbox);
		context.snapshot = await takeSnapshot(context.sandbox);
	});

	afterEach(async ({ sandbox, snapshot }) => {
		await snapshot.validate();

		await shutdown(sandbox);
	});

	it("should accept validator resignation", async (context) => {
		const [registrationTx, resignationTx] = await ValidatorResignations.makeValidValidatorResignation(context);
		await addTransactionsToPool(context, [registrationTx]);
		await waitBlock(context);
		assert.false(await hasResigned(context, registrationTx.data.senderPublicKey));

		await addTransactionsToPool(context, [resignationTx]);
		await waitBlock(context);

		assert.true(await hasResigned(context, registrationTx.data.senderPublicKey));
	});

	it("should reject resignation if not enough validators", async (context) => {
		const [validator1] = context.wallets;

		const resignationTx = await ValidatorResignations.makeValidatorResignation(context, { sender: validator1 });
		const result = await addTransactionsToPool(context, [resignationTx]);

		assert.equal(result.invalid, [0]);
		assert.equal(result.errors, {
			0: {
				message: `tx ${resignationTx.id} cannot be applied: Failed to apply transaction, because not enough validators to allow resignation.`,
				type: "ERR_APPLY",
			},
		});
	});

	it("should reject validator resignation if not registered", async (context) => {
		const tx = await ValidatorResignations.makeInvalidValidatorResignationForNonValidator(context);

		const result = await addTransactionsToPool(context, [tx]);
		assert.equal(result.invalid, [0]);
		assert.equal(result.errors, {
			0: {
				message: `tx ${tx.id} cannot be applied: Failed to apply transaction, because the wallet is not a validator.`,
				type: "ERR_APPLY",
			},
		});
	});

	it("should reject double resignation", async (context) => {
		const [registrationTx, resignationTx, resignationTx2] =
			await ValidatorResignations.makeInvalidDoubleValidatorResignation(context);

		await addTransactionsToPool(context, [registrationTx]);
		await waitBlock(context);
		assert.false(await hasResigned(context, registrationTx.data.senderPublicKey));

		await addTransactionsToPool(context, [resignationTx]);
		await waitBlock(context);

		const result = await addTransactionsToPool(context, [resignationTx2]);
		assert.equal(result.invalid, [0]);
		assert.equal(result.errors, {
			0: {
				message: `tx ${resignationTx2.id} cannot be applied: Failed to apply transaction, because the wallet already resigned as validator.`,
				type: "ERR_APPLY",
			},
		});
	});

	it("should reject registration after resignation", async (context) => {
		const [registrationTx1, resignationTx, registrationTx2] =
			await ValidatorResignations.makeInvalidValidatorRegistrationAfterResignation(context);

		await addTransactionsToPool(context, [registrationTx1]);
		await waitBlock(context);
		assert.false(await hasResigned(context, registrationTx1.data.senderPublicKey));

		await addTransactionsToPool(context, [resignationTx]);
		await waitBlock(context);

		const result = await addTransactionsToPool(context, [registrationTx2]);
		assert.equal(result.invalid, [0]);
		assert.equal(result.errors, {
			0: {
				message: `tx ${registrationTx2.id} cannot be applied: Failed to apply transaction, because the wallet is already a validator.`,
				type: "ERR_APPLY",
			},
		});
	});

	it("should only accept one validator resignation per sender in pool at the same time", async (context) => {
		const { wallets } = context;
		const [validator1] = wallets;

		const randomWallet = await getRandomFundedWallet(context, validator1);

		const registrationTx = await ValidatorRegistrations.makeValidatorRegistration(context, {
			nonceOffset: 0,
			sender: randomWallet,
		});
		await addTransactionsToPool(context, [registrationTx]);
		await waitBlock(context);

		// Submit 2 resignations, but only one will be accepted
		const resignationTx1 = await ValidatorResignations.makeValidatorResignation(context, {
			nonceOffset: 0,
			sender: randomWallet,
		});

		const resignationTx2 = await ValidatorResignations.makeValidatorResignation(context, {
			nonceOffset: 1,
			sender: randomWallet,
		});
		const result = await addTransactionsToPool(context, [resignationTx1, resignationTx2]);
		await waitBlock(context);

		assert.equal(result.accept, [0]);
		assert.equal(result.invalid, [1]);
		assert.equal(result.errors, {
			1: {
				message: `tx ${resignationTx2.id} cannot be applied: Validator resignation for "${randomWallet.publicKey}" already in the pool`,
				type: "ERR_APPLY",
			},
		});
	});
});
