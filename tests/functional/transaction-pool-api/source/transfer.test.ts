import { Contracts, Identifiers } from "@mainsail/contracts";
import { describe, Sandbox } from "@mainsail/test-framework";
import { BigNumber } from "@mainsail/utils";

import { setup, shutdown } from "./setup.js";
import { Snapshot, takeSnapshot } from "./snapshot.js";
import {
	addTransactionsToPool,
	getMultiSignatureWallet,
	getRandomColdWallet,
	getRandomFundedWallet,
	getWallets,
	hasBalance,
	isTransactionCommitted,
	makeMultiSignatureRegistration,
	makeTransfer,
	waitBlock,
} from "./utils.js";

describe<{
	sandbox: Sandbox;
	snapshot: Snapshot;
	wallets: Contracts.Crypto.KeyPair[];
}>("Transfer", ({ beforeEach, afterEach, it, assert }) => {
	beforeEach(async (context) => {
		context.sandbox = await setup();
		context.wallets = await getWallets(context.sandbox);
		context.snapshot = await takeSnapshot(context.sandbox);
	});

	afterEach(async ({ sandbox, snapshot }) => {
		await snapshot.validate();

		await shutdown(sandbox);
	});

	it("should accept and commit simple transfer", async ({ sandbox, snapshot, wallets }) => {
		const [sender] = wallets;

		const tx = await makeTransfer(sandbox, { sender });

		const result = await addTransactionsToPool(sandbox, [tx]);
		assert.equal(result.accept, [0]);
		assert.equal(result.broadcast, [0]);

		await waitBlock(sandbox);

		assert.true(await isTransactionCommitted(sandbox, tx));
	});

	it("should accept and transfer funds [multi signature]", async ({ sandbox, wallets }) => {
		const [sender] = wallets;

		// Register multi sig wallet
		const randomWallet = await getRandomFundedWallet(sandbox, sender);

		const participant1 = await getRandomColdWallet(sandbox);
		const participant2 = await getRandomColdWallet(sandbox);
		const participants = [participant1.keyPair, participant2.keyPair];

		const multiSigRegistrationTx = await makeMultiSignatureRegistration(sandbox, {
			participants,
			sender: randomWallet,
		});

		await addTransactionsToPool(sandbox, [multiSigRegistrationTx]);
		await waitBlock(sandbox);

		// Now send funds to multi sig wallet
		const multiSigwallet = await getMultiSignatureWallet(sandbox, participants);

		const amount = BigNumber.make(25_000_000_000);
		const fundTx = await makeTransfer(sandbox, { amount, recipient: multiSigwallet.getAddress(), sender });

		await addTransactionsToPool(sandbox, [fundTx]);
		await waitBlock(sandbox);

		assert.true(await hasBalance(sandbox, multiSigwallet.getAddress(), amount));

		// Send funds from multi sig to another random wallet
		const randomWallet2 = await getRandomColdWallet(sandbox);

		const transferTx = await makeTransfer(sandbox, {
			amount: BigNumber.ONE,
			multiSigKeys: participants,
			recipient: randomWallet2.address,
			sender,
		});

		await addTransactionsToPool(sandbox, [transferTx]);
		await waitBlock(sandbox);

		assert.true(await hasBalance(sandbox, randomWallet2.address, BigNumber.ONE));
	});

	it("should not accept simple transfer [invalid fee]", async ({ sandbox, wallets }) => {
		const [sender] = wallets;

		const tx = await makeTransfer(sandbox, { sender, fee: "1234" });

		const result = await addTransactionsToPool(sandbox, [tx]);
		assert.equal(result.invalid, [0]);
		assert.equal(result.errors, {
			0: {
				message: `tx ${tx.id} fee is too low to enter the pool`,
				type: "ERR_LOW_FEE",
			},
		});

		await waitBlock(sandbox);
		assert.false(await isTransactionCommitted(sandbox, tx));
	});

	it("should not accept simple transfer [invalid amount]", async ({ sandbox, wallets }) => {
		const [sender] = wallets;

		const { walletRepository } = sandbox.app.get<Contracts.State.Service>(Identifiers.State.Service).getStore();
		const balance = (await walletRepository.findByPublicKey(sender.publicKey)).getBalance();

		const tx = await makeTransfer(sandbox, { sender, amount: balance.plus(1) });

		const result = await addTransactionsToPool(sandbox, [tx]);
		assert.equal(result.invalid, [0]);
		assert.equal(result.errors, {
			0: {
				message: `tx ${tx.id} cannot be applied: Insufficient balance in the wallet.`,
				type: "ERR_APPLY",
			},
		});

		await waitBlock(sandbox);
		assert.false(await isTransactionCommitted(sandbox, tx));
	});

	it("should not accept simple transfer [invalid signature]", async ({ sandbox, wallets }) => {
		const [sender] = wallets;

		const tx = await makeTransfer(sandbox, {
			sender,
			signature:
				"8dd7af61d8fa4720bf6388b5d89f8b243587697c6e65e63d2fedf3c8440594366415395075885249a0aab8b6570298491837e364c6c4f9f658c63d4633ea6ff9",
		});

		const result = await addTransactionsToPool(sandbox, [tx]);
		assert.equal(result.invalid, [0]);
		assert.equal(result.errors![0].type, "ERR_BAD_DATA");
		assert.true(result.errors![0].message.includes("didn't pass verification"));

		await waitBlock(sandbox);
		assert.false(await isTransactionCommitted(sandbox, tx));
	});

	it("should not accept simple transfer [malformed signature]", async ({ sandbox, wallets }) => {
		const [sender] = wallets;

		const tx = await makeTransfer(sandbox, { sender, signature: "5161a55859e0be86080ca54d9" });

		const result = await addTransactionsToPool(sandbox, [tx]);
		assert.equal(result.invalid, [0]);
		assert.equal(result.errors, {
			0: {
				message:
					"Invalid transaction data: Failed to deserialize transaction, encountered invalid bytes: Read over buffer boundary. (length: 64, remaining: 12, diff: 52)",
				type: "ERR_BAD_DATA",
			},
		});

		await waitBlock(sandbox);
		assert.false(await isTransactionCommitted(sandbox, tx));
	});
});
