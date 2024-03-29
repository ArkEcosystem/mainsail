import { Contracts } from "@mainsail/contracts";
import { describe, Sandbox } from "@mainsail/test-framework";

import { setup, shutdown } from "./setup.js";
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
	wallets: Contracts.Crypto.KeyPair[];
}>("ValidatorRegistration", ({ beforeEach, afterEach, it, assert }) => {
	beforeEach(async (context) => {
		context.sandbox = await setup();
		context.wallets = await getWallets(context.sandbox);
	});

	afterEach(async (context) => shutdown(context.sandbox));

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
		assert.equal(result.errors[0].type, "ERR_APPLY");
		assert.equal(
			result.errors[0].message,
			`tx ${registrationTx2.id} cannot be applied: Failed to apply transaction, because the wallet is already a validator.`,
		);
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
		assert.equal(result.errors[0].type, "ERR_APPLY");
		assert.equal(
			result.errors[0].message,
			`tx ${registrationTx2.id} cannot be applied: Failed to apply transaction, because the validator public key '${consensusPublicKey.publicKey}' is already registered.`,
		);
	});
});
