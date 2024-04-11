import { Contracts } from "@mainsail/contracts";
import { describe, Sandbox } from "@mainsail/test-framework";
import { ValidatorRegistrations } from "@mainsail/test-transaction-builders";

import { setup, shutdown } from "./setup.js";
import { Snapshot, takeSnapshot } from "./snapshot.js";
import {
	addTransactionsToPool,
	getRandomConsensusKeyPair,
	getRandomFundedWallet,
	getWallets,
	isValidator,
	waitBlock,
} from "./utils.js";

describe<{
	sandbox: Sandbox;
	snapshot: Snapshot;
	wallets: Contracts.Crypto.KeyPair[];
}>("ValidatorRegistration", ({ beforeEach, afterEach, it, assert }) => {
	beforeEach(async (context) => {
		context.sandbox = await setup();
		context.wallets = await getWallets(context.sandbox);
		context.snapshot = await takeSnapshot(context.sandbox);
	});

	afterEach(async ({ sandbox, snapshot }) => {
		await snapshot.validate();

		await shutdown(sandbox);
	});

	it("should accept validator registration", async (context) => {
		const registrationTx = await ValidatorRegistrations.makeValidatorRegistration(context);

		await addTransactionsToPool(context, [registrationTx]);
		await waitBlock(context);
		assert.true(await isValidator(context, registrationTx.data.senderPublicKey));
	});

	it("should reject registration if already a validator", async (context) => {
		const [registrationTx1, registrationTx2] =
			await ValidatorRegistrations.makeInvalidValidatorRegistrationIfAlreadyValidator(context);

		await addTransactionsToPool(context, [registrationTx1]);
		await waitBlock(context);
		assert.true(await isValidator(context, registrationTx1.data.senderPublicKey));

		const result = await addTransactionsToPool(context, [registrationTx2]);
		assert.equal(result.invalid, [0]);
		assert.equal(result.errors, {
			0: {
				message: `tx ${registrationTx2.id} cannot be applied: Failed to apply transaction, because the wallet is already a validator.`,
				type: "ERR_APPLY",
			},
		});
	});

	it("should reject registration if consensus public key already used", async (context) => {
		const validatorPublicKey = (await getRandomConsensusKeyPair(context)).publicKey;

		const [registrationTx1, registrationTx2] =
			await ValidatorRegistrations.makeInvalidValidatorRegistrationWithExistingPublicKeyAsset(context, {
				validatorPublicKey,
			});

		await addTransactionsToPool(context, [registrationTx1]);
		await waitBlock(context);
		assert.true(await isValidator(context, registrationTx1.data.senderPublicKey));

		const result = await addTransactionsToPool(context, [registrationTx2]);
		assert.equal(result.invalid, [0]);
		assert.equal(result.errors, {
			0: {
				message: `tx ${registrationTx2.id} cannot be applied: Failed to apply transaction, because the validator public key '${validatorPublicKey}' is already registered.`,
				type: "ERR_APPLY",
			},
		});
	});

	it("should only accept one validator registration per sender in pool at the same time", async (context) => {
		const { wallets } = context;
		const [validator1] = wallets;

		const randomWallet = await getRandomFundedWallet(context, validator1);

		// Submit 2 registrations, but only one will be accepted
		const registrationTx1 = await ValidatorRegistrations.makeValidatorRegistration(context, {
			nonceOffset: 0,
			sender: randomWallet,
		});

		const registrationTx2 = await ValidatorRegistrations.makeValidatorRegistration(context, {
			nonceOffset: 1,
			sender: randomWallet,
		});
		const result = await addTransactionsToPool(context, [registrationTx1, registrationTx2]);
		await waitBlock(context);

		assert.equal(result.accept, [0]);
		assert.equal(result.invalid, [1]);
		assert.equal(result.errors, {
			1: {
				message: `tx ${registrationTx2.id} cannot be applied: Sender ${randomWallet.publicKey} already has a transaction of type '2' in the pool`,
				type: "ERR_APPLY",
			},
		});
	});

	it("should reject duplicate validator BLS key in pool", async (context) => {
		const validatorPublicKey = (await getRandomConsensusKeyPair(context)).publicKey;

		const [registrationTx1, registrationTx2] =
			await ValidatorRegistrations.makeInvalidValidatorRegistrationWithExistingPublicKeyAsset(context, {
				validatorPublicKey,
			});

		// Submit 2 registration from different wallets using same BLS key
		const result = await addTransactionsToPool(context, [registrationTx1, registrationTx2]);
		await waitBlock(context);

		assert.equal(result.accept, [0]);
		assert.equal(result.invalid, [1]);
		assert.equal(result.errors, {
			1: {
				message: `tx ${registrationTx2.id} cannot be applied: Validator registration for public key "${validatorPublicKey}" already in the pool`,
				type: "ERR_APPLY",
			},
		});
	});
});
