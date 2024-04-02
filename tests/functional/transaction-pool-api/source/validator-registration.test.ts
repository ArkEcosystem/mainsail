import { Contracts } from "@mainsail/contracts";
import { describe, Sandbox } from "@mainsail/test-framework";

import { setup, shutdown } from "./setup.js";
import { Snapshot, takeSnapshot } from "./snapshot.js";
import {
	addTransactionsToPool,
	getRandomConsensusKeyPair,
	getRandomFundedWallet,
	getWallets,
	isValidator,
	makeValidatorRegistration,
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

	it("should accept validator registration", async ({ sandbox, wallets }) => {
		const [sender] = wallets;

		const randomWallet = await getRandomFundedWallet(sandbox, sender);

		const registrationTx = await makeValidatorRegistration(sandbox, { sender: randomWallet });
		await addTransactionsToPool(sandbox, [registrationTx]);
		await waitBlock(sandbox);
		assert.true(await isValidator(sandbox, randomWallet.publicKey));
	});

	it("should reject registration if already a validator", async ({ sandbox, wallets }) => {
		const [sender] = wallets;

		const randomWallet = await getRandomFundedWallet(sandbox, sender);

		const registrationTx = await makeValidatorRegistration(sandbox, { sender: randomWallet });
		await addTransactionsToPool(sandbox, [registrationTx]);
		await waitBlock(sandbox);
		assert.true(await isValidator(sandbox, randomWallet.publicKey));

		const registrationTx2 = await makeValidatorRegistration(sandbox, { sender: randomWallet });
		const result = await addTransactionsToPool(sandbox, [registrationTx2]);
		assert.equal(result.invalid, [0]);
		assert.equal(result.errors, {
			0: {
				message: `tx ${registrationTx2.id} cannot be applied: Failed to apply transaction, because the wallet is already a validator.`,
				type: "ERR_APPLY",
			},
		});
	});

	it("should reject registration if consensus public key already used", async ({ sandbox, wallets }) => {
		const [sender] = wallets;

		const randomWallet = await getRandomFundedWallet(sandbox, sender);
		const randomWallet2 = await getRandomFundedWallet(sandbox, sender);

		const consensusPublicKey = await getRandomConsensusKeyPair(sandbox);
		const registrationTx = await makeValidatorRegistration(sandbox, {
			sender: randomWallet,
			validatorPublicKey: consensusPublicKey.publicKey,
		});
		await addTransactionsToPool(sandbox, [registrationTx]);
		await waitBlock(sandbox);
		assert.true(await isValidator(sandbox, randomWallet.publicKey));

		// Can't reuse key with randomWallet2
		const registrationTx2 = await makeValidatorRegistration(sandbox, {
			sender: randomWallet2,
			validatorPublicKey: consensusPublicKey.publicKey,
		});
		const result = await addTransactionsToPool(sandbox, [registrationTx2]);
		assert.equal(result.invalid, [0]);
		assert.equal(result.errors, {
			0: {
				message: `tx ${registrationTx2.id} cannot be applied: Failed to apply transaction, because the validator public key '${consensusPublicKey.publicKey}' is already registered.`,
				type: "ERR_APPLY",
			},
		});
	});

	it("should only accept one validator registration per sender in pool at the same time", async ({
		sandbox,
		wallets,
	}) => {
		const [validator1] = wallets;

		const randomWallet = await getRandomFundedWallet(sandbox, validator1);

		// Submit 2 registrations, but only one will be accepted
		const registrationTx1 = await makeValidatorRegistration(sandbox, {
			nonceOffset: 0,
			sender: randomWallet,
		});

		const registrationTx2 = await makeValidatorRegistration(sandbox, {
			nonceOffset: 1,
			sender: randomWallet,
		});
		const result = await addTransactionsToPool(sandbox, [registrationTx1, registrationTx2]);
		await waitBlock(sandbox);

		assert.equal(result.accept, [0]);
		assert.equal(result.invalid, [1]);
		assert.equal(result.errors, {
			1: {
				message: `tx ${registrationTx2.id} cannot be applied: Sender ${randomWallet.publicKey} already has a transaction of type '2' in the pool`,
				type: "ERR_APPLY",
			},
		});
	});

	it("should reject duplicate validator BLS key", async ({ sandbox, wallets }) => {
		const [validator1] = wallets;

		const randomWallet1 = await getRandomFundedWallet(sandbox, validator1);
		const randomWallet2 = await getRandomFundedWallet(sandbox, validator1);

		const validatorKey = (await getRandomConsensusKeyPair(sandbox)).publicKey;

		// Submit 2 registration from different wallets using same BLS key
		const registrationTx1 = await makeValidatorRegistration(sandbox, {
			nonceOffset: 0,
			sender: randomWallet1,
			validatorPublicKey: validatorKey,
		});

		const registrationTx2 = await makeValidatorRegistration(sandbox, {
			nonceOffset: 1,
			sender: randomWallet2,
			validatorPublicKey: validatorKey,
		});
		const result = await addTransactionsToPool(sandbox, [registrationTx1, registrationTx2]);
		await waitBlock(sandbox);

		assert.equal(result.accept, [0]);
		assert.equal(result.invalid, [1]);
		assert.equal(result.errors, {
			1: {
				message: `tx ${registrationTx2.id} cannot be applied: Validator registration for public key "${validatorKey}" already in the pool`,
				type: "ERR_APPLY",
			},
		});
	});
});
