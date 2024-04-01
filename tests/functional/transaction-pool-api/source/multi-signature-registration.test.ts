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

	it("should accept multi signature registration within min and max participants", async ({ sandbox, wallets }) => {
		const [sender] = wallets;

		const randomWallet = await getRandomFundedWallet(sandbox, sender);
		const randomWallet2 = await getRandomFundedWallet(sandbox, sender);

		const minParticipants = 1;
		const maxParticipants = 16;

		const allParticipants: Contracts.Crypto.KeyPair[] = [];
		for (let i = 0; i < maxParticipants; i++) {
			allParticipants.push((await getRandomColdWallet(sandbox)).keyPair);
		}

		const minimumParticipants = allParticipants.slice(0, minParticipants);
		const registrationTxMin = await makeMultiSignatureRegistration(sandbox, {
			participants: minimumParticipants,
			sender: randomWallet,
		});
		const registrationTxMax = await makeMultiSignatureRegistration(sandbox, {
			participants: allParticipants,
			sender: randomWallet2,
		});

		const result = await addTransactionsToPool(sandbox, [registrationTxMin, registrationTxMax]);
		assert.equal(result.accept, [0, 1]);
		await waitBlock(sandbox);

		const walletWithMinParticipants = await getMultiSignatureWallet(sandbox, minimumParticipants);
		assert.true(walletWithMinParticipants.hasMultiSignature());

		const walletWithMaxParticipants = await getMultiSignatureWallet(sandbox, allParticipants);
		assert.true(walletWithMaxParticipants.hasMultiSignature());
	});

	it("should reject multi signature registration below min or above max participants", async ({
		sandbox,
		wallets,
	}) => {
		const [sender] = wallets;

		const randomWallet = await getRandomFundedWallet(sandbox, sender);
		const randomWallet2 = await getRandomFundedWallet(sandbox, sender);

		const minParticipants = 1; // set to 0 in callback below
		const maxParticipants = 16 + 1;

		const allParticipants: Contracts.Crypto.KeyPair[] = [];
		for (let index = 0; index < maxParticipants; index++) {
			allParticipants.push((await getRandomColdWallet(sandbox)).keyPair);
		}

		const minimumParticipants = allParticipants.slice(0, minParticipants);
		const registrationTxMin = await makeMultiSignatureRegistration(sandbox, {
			callback: async (transaction) => {
				// set min participants to 0
				transaction.serialized.fill(0, 58, 59);
			},
			participants: minimumParticipants,
			sender: randomWallet,
		});
		const registrationTxMax = await makeMultiSignatureRegistration(sandbox, {
			participants: allParticipants,
			sender: randomWallet2,
		});

		const result = await addTransactionsToPool(sandbox, [registrationTxMin, registrationTxMax]);
		assert.equal(result.accept, []);
		assert.equal(result.invalid, [0, 1]);
		assert.equal(result.errors, {
			0: {
				message:
					"Invalid transaction data: data/asset/multiSignature/min must be >= 1, data/asset/multiSignature/min must be >= 1, data/asset/multiSignature/min must be >= 1, data must match a schema in anyOf",
				type: "ERR_BAD_DATA",
			},
			1: {
				message:
					"Invalid transaction data: data/asset/multiSignature/publicKeys must NOT have more than 16 items, data/asset/multiSignature/publicKeys must NOT have more than 16 items, data/asset/multiSignature/publicKeys must NOT have more than 16 items, data must match a schema in anyOf",
				type: "ERR_BAD_DATA",
			},
		});
	});

	it("should only accept one multi signature registration from sender in pool at the same time", async ({
		sandbox,
		wallets,
	}) => {
		const [sender] = wallets;

		const randomWallet = await getRandomFundedWallet(sandbox, sender);

		const participant1 = await getRandomColdWallet(sandbox);
		const participant2 = await getRandomColdWallet(sandbox);
		const participants = [participant1.keyPair, participant2.keyPair];

		const registrationTx1 = await makeMultiSignatureRegistration(sandbox, {
			participants,
			sender: randomWallet,
		});

		const registrationTx2 = await makeMultiSignatureRegistration(sandbox, {
			participants,
			sender: randomWallet,
		});

		// Submit 2 registration with same asset => only first gets accepted
		const result = await addTransactionsToPool(sandbox, [registrationTx1, registrationTx2]);
		assert.equal(result.accept, [0]);
		assert.equal(result.invalid, [1]);
		assert.equal(result.errors, {
			1: {
				message: `tx ${registrationTx2.id} cannot be applied: Sender ${randomWallet.publicKey} already has a transaction of type '4' in the pool`,
				type: "ERR_APPLY",
			},
		});
	});

	it("should reject multiple multi signature registration for same asset in pool at the same time", async ({
		sandbox,
		wallets,
	}) => {
		const [sender] = wallets;

		const randomWallet = await getRandomFundedWallet(sandbox, sender);
		const randomWallet2 = await getRandomFundedWallet(sandbox, sender);

		const participant1 = await getRandomColdWallet(sandbox);
		const participant2 = await getRandomColdWallet(sandbox);
		const participants = [participant1.keyPair, participant2.keyPair];

		const registrationTx1 = await makeMultiSignatureRegistration(sandbox, {
			participants,
			sender: randomWallet,
		});

		const registrationTx2 = await makeMultiSignatureRegistration(sandbox, {
			participants,
			sender: randomWallet2,
		});

		const multiSigAddress = await getMultiSignatureWallet(sandbox, participants);

		// Submit 2 registration with same asset => only first gets accepted
		const result = await addTransactionsToPool(sandbox, [registrationTx1, registrationTx2]);
		assert.equal(result.accept, [0]);
		assert.equal(result.invalid, [1]);
		assert.equal(result.errors, {
			1: {
				message: `tx ${registrationTx2.id} cannot be applied: MultiSignatureRegistration for address ${multiSigAddress} already in the pool`,
				type: "ERR_APPLY",
			},
		});
	});
});
