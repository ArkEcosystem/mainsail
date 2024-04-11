import { Contracts } from "@mainsail/contracts";
import { describe, Sandbox } from "@mainsail/test-framework";
import { MultiSignatureRegistrations } from "@mainsail/test-transaction-builders";

import { setup, shutdown } from "./setup.js";
import { Snapshot, takeSnapshot } from "./snapshot.js";
import { addTransactionsToPool, getMultiSignatureWallet, getWallets, waitBlock } from "./utils.js";

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

	it("should accept and process multi signature registration", async (context) => {
		const tx = await MultiSignatureRegistrations.makeValidMultiSignatureRegistration(context);
		await addTransactionsToPool(context, [tx]);
		await waitBlock(context);

		const wallet = await getMultiSignatureWallet(context, tx.data.asset!.multiSignature!);
		assert.true(wallet.hasMultiSignature());
	});

	it("should reject multi signature registration if already registered", async (context) => {
		const [registrationTx1, registrationTx2] =
			await MultiSignatureRegistrations.makeDuplicateMultiSignatureRegistration(context);

		await addTransactionsToPool(context, [registrationTx1]);
		await waitBlock(context);

		const result = await addTransactionsToPool(context, [registrationTx2]);
		assert.equal(result.invalid, [0]);
		assert.equal(result.errors, {
			0: {
				message: `tx ${registrationTx2.id} cannot be applied: Failed to apply transaction, because multi signature is already enabled.`,
				type: "ERR_APPLY",
			},
		});
	});

	it("should reject multi signature registration if any signature invalid", async (context) => {
		const tx =
			await MultiSignatureRegistrations.makeInvalidMultiSignatureRegistrationWithInvalidParticipantSignature(
				context,
			);

		const result = await addTransactionsToPool(context, [tx]);
		assert.equal(result.invalid, [0]);
		assert.equal(result.errors, {
			0: {
				message: `tx ${tx.id} cannot be applied: Failed to apply transaction, because the multi signature could not be verified.`,
				type: "ERR_APPLY",
			},
		});
	});

	it("should accept multi signature registration within min and max participants", async (context) => {
		const [registrationTxMin, registrationTxMax] =
			await MultiSignatureRegistrations.makeValidMultiSignatureRegistrationWithMinAndMaxParticipants(context);

		const result = await addTransactionsToPool(context, [registrationTxMin, registrationTxMax]);
		assert.equal(result.accept, [0, 1]);
		await waitBlock(context);

		const walletWithMinParticipants = await getMultiSignatureWallet(
			context,
			registrationTxMin.data.asset!.multiSignature!,
		);
		assert.true(walletWithMinParticipants.hasMultiSignature());

		const walletWithMaxParticipants = await getMultiSignatureWallet(
			context,
			registrationTxMax.data.asset!.multiSignature!,
		);
		assert.true(walletWithMaxParticipants.hasMultiSignature());
	});

	it("should reject multi signature registration below min or above max participants", async (context) => {
		const [registrationTx1, registrationTx2, registrationTx3] =
			await MultiSignatureRegistrations.makeInvalidMultiSignatureRegistratioOutsideMinMaxParticipants(context);

		const result = await addTransactionsToPool(context, [registrationTx1, registrationTx2, registrationTx3]);
		assert.equal(result.accept, []);
		assert.equal(result.invalid, [0, 1, 2]);
		assert.equal(result.errors, {
			0: {
				message:
					"Invalid transaction data: data/asset/multiSignature/min must be >= 1, data/asset/multiSignature/min must be >= 1, data/asset/multiSignature/min must be >= 1, data must match a schema in anyOf",
				type: "ERR_BAD_DATA",
			},
			1: {
				message:
					"Invalid transaction data: data/asset/multiSignature/publicKeys must NOT have fewer than 2 items, data/asset/multiSignature/publicKeys must NOT have fewer than 2 items, data/asset/multiSignature/publicKeys must NOT have fewer than 2 items, data must match a schema in anyOf",
				type: "ERR_BAD_DATA",
			},
			2: {
				message:
					"Invalid transaction data: data/asset/multiSignature/publicKeys must NOT have more than 16 items, data/asset/multiSignature/publicKeys must NOT have more than 16 items, data/asset/multiSignature/publicKeys must NOT have more than 16 items, data must match a schema in anyOf",
				type: "ERR_BAD_DATA",
			},
		});
	});

	it("should only accept one multi signature registration from sender in pool at the same time", async (context) => {
		const [registrationTx1, registrationTx2] =
			await MultiSignatureRegistrations.makeDuplicateMultiSignatureRegistration(context);

		// Submit 2 registration with same asset => only first gets accepted
		const result = await addTransactionsToPool(context, [registrationTx1, registrationTx2]);
		assert.equal(result.accept, [0]);
		assert.equal(result.invalid, [1]);
		assert.equal(result.errors, {
			1: {
				message: `tx ${registrationTx2.id} cannot be applied: Sender ${registrationTx1.data.senderPublicKey} already has a transaction of type '4' in the pool`,
				type: "ERR_APPLY",
			},
		});
	});

	it("should reject multiple multi signature registration for same asset in pool at the same time", async (context) => {
		const [registrationTx1, registrationTx2] =
			await MultiSignatureRegistrations.makeMultiSignatureRegistrationSameAssetDifferentSender(context);

		const multiSigAddress = await getMultiSignatureWallet(context, registrationTx1.data.asset!.multiSignature!);

		// Submit 2 registration with same asset => only first gets accepted
		const result = await addTransactionsToPool(context, [registrationTx1, registrationTx2]);
		assert.equal(result.accept, [0]);
		assert.equal(result.invalid, [1]);
		assert.equal(result.errors, {
			1: {
				message: `tx ${registrationTx2.id} cannot be applied: MultiSignatureRegistration for address ${multiSigAddress} already in the pool`,
				type: "ERR_APPLY",
			},
		});
	});

	it("should reject multi signature registration if missing participant signature", async (context) => {
		const registrationTx =
			await MultiSignatureRegistrations.makeInvalidMultiSignatureRegistrationWithMissingParticipantSignature(
				context,
			);

		const result = await addTransactionsToPool(context, [registrationTx]);
		assert.equal(result.accept, []);
		assert.equal(result.invalid, [0]);
		assert.equal(result.errors, {
			0: {
				message:
					"Invalid transaction data: data/signatures must NOT have fewer than 3 items, data/signatures must NOT have fewer than 3 items, data/signatures must NOT have fewer than 3 items, data must match a schema in anyOf",
				type: "ERR_BAD_DATA",
			},
		});
	});
});
