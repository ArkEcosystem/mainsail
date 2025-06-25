import { Contracts, Identifiers } from "@mainsail/contracts";
import { describe, Sandbox } from "@mainsail/test-framework";
import { EvmCalls, Utils } from "@mainsail/test-transaction-builders";
import { setup, shutdown } from "./setup.js";
import { Snapshot, takeSnapshot } from "./snapshot.js";
import {
	addTransactionsToPool,
	getLegacyColdWallets,
	getTransactionReceipt,
	getWallets,
	isTransactionCommitted,
	waitBlock,
} from "./utilities.js";
import { ethers } from "ethers";

describe<{
	sandbox: Sandbox;
	snapshot: Snapshot;
	wallets: Contracts.Crypto.KeyPair[];
	legacyColdWallets: {
		keyPair: Contracts.Crypto.KeyPair;
		mainsailAddress: string;
		legacyColdWallet: Contracts.Evm.LegacyColdWallet;
	}[];
}>("EVM Call", ({ beforeEach, afterEach, it, assert }) => {
	beforeEach(async (context) => {
		context.sandbox = await setup();
		context.wallets = await getWallets(context.sandbox);
		context.legacyColdWallets = await getLegacyColdWallets(context.sandbox);
		context.snapshot = await takeSnapshot(context.sandbox);
	});

	afterEach(async ({ sandbox, snapshot }) => {
		await snapshot.validate();

		await shutdown(sandbox);
	});

	it("should accept and commit evm call", async (context) => {
		const randomWallet = await Utils.getRandomColdWallet(context);

		const tx = await EvmCalls.makeEvmCall(context, { recipient: randomWallet.address });

		const { accept } = await addTransactionsToPool(context, [tx]);
		assert.equal(accept, [0]);

		await waitBlock(context);
		assert.true(await isTransactionCommitted(context, tx));
	});

	it("should deploy contract and interact with it", async (context) => {
		const deployTx = await EvmCalls.makeEvmCallDeployErc20Contract(context);

		let { accept } = await addTransactionsToPool(context, [deployTx]);
		assert.equal(accept, [0]);

		await waitBlock(context);
		assert.true(await isTransactionCommitted(context, deployTx));

		const erc20Address = ethers.getCreateAddress({
			from: ethers.computeAddress(`0x${deployTx.data.senderPublicKey}`),
			nonce: 2,
		});

		// Successfully transfer tokens on new contract
		const randomWallet = await Utils.getRandomColdWallet(context);

		const balanceBefore = await EvmCalls.getErc20BalanceOf(context, erc20Address, randomWallet.address);
		assert.equal(balanceBefore, 0n);

		const transferTx = await EvmCalls.makeEvmCall(context, {
			recipient: erc20Address,
			payload: EvmCalls.encodeErc20Transfer(randomWallet.address, ethers.parseEther("1234")),
		});

		({ accept } = await addTransactionsToPool(context, [transferTx]));
		assert.equal(accept, [0]);

		await waitBlock(context);
		assert.true(await isTransactionCommitted(context, transferTx));

		// Check final balance
		const balanceAfter = await EvmCalls.getErc20BalanceOf(context, erc20Address, randomWallet.address);
		assert.equal(balanceAfter, ethers.parseEther("1234"));
	});

	it("should accept legacy cold wallet transaction", async (context) => {
		const [legacyColdWallet] = context.legacyColdWallets;

		const evm = context.sandbox.app.getTagged<Contracts.Evm.Instance>(Identifiers.Evm.Instance, "instance", "evm");

		const legacyBefore = await evm.getAccountInfoExtended(
			legacyColdWallet.mainsailAddress,
			legacyColdWallet.legacyColdWallet.address,
		);
		assert.equal(legacyBefore.balance, legacyColdWallet.legacyColdWallet.balance);

		const randomWallet = await Utils.getRandomColdWallet(context);

		const recipientBefore = await evm.getAccountInfo(randomWallet.address);
		assert.equal(recipientBefore.balance, 0n);

		const tx = await EvmCalls.makeEvmCall(context, {
			sender: legacyColdWallet.keyPair,
			recipient: randomWallet.address,
			value: 5n,
		});

		const { accept } = await addTransactionsToPool(context, [tx]);
		assert.equal(accept, [0]);

		await waitBlock(context);
		assert.true(await isTransactionCommitted(context, tx));

		const legacyAfter = await evm.getAccountInfo(legacyColdWallet.mainsailAddress);
		assert.equal(legacyAfter.balance, legacyBefore.balance - 108160000000000n - 5n);

		const recipientAfter = await evm.getAccountInfo(randomWallet.address);
		assert.equal(recipientAfter.balance, 5n);
	});

	it("should accept consecutive legacy cold wallet transactions", async (context) => {
		const [legacyColdWallet] = context.legacyColdWallets;

		const evm = context.sandbox.app.getTagged<Contracts.Evm.Instance>(Identifiers.Evm.Instance, "instance", "evm");

		const legacyBefore = await evm.getAccountInfoExtended(
			legacyColdWallet.mainsailAddress,
			legacyColdWallet.legacyColdWallet.address,
		);
		assert.equal(legacyBefore.balance, legacyColdWallet.legacyColdWallet.balance);

		const randomWallet = await Utils.getRandomColdWallet(context);

		const recipientBefore = await evm.getAccountInfo(randomWallet.address);
		assert.equal(recipientBefore.balance, 0n);

		const gasSpentPerTx = 108160000000000n;
		const valuePerTx = 5n;
		const N = 10n;

		for (let i = 0; i < N; i++) {
			const tx = await EvmCalls.makeEvmCall(context, {
				sender: legacyColdWallet.keyPair,
				recipient: randomWallet.address,
				value: valuePerTx,
			});

			const { accept } = await addTransactionsToPool(context, [tx]);
			assert.equal(accept, [0]);

			await waitBlock(context);
			await isTransactionCommitted(context, tx);
		}

		const legacyAfter = await evm.getAccountInfo(legacyColdWallet.mainsailAddress);
		assert.equal(legacyAfter.balance, legacyBefore.balance - (gasSpentPerTx + valuePerTx) * N);

		const recipientAfter = await evm.getAccountInfo(randomWallet.address);
		assert.equal(recipientAfter.balance, N * valuePerTx);
	});

	it("should accept legacy cold wallet as mainsail address recipient and merge existing balance", async (context) => {
		const [fundedWallet] = context.wallets;
		const [legacyColdWallet] = context.legacyColdWallets;

		const evm = context.sandbox.app.getTagged<Contracts.Evm.Instance>(Identifiers.Evm.Instance, "instance", "evm");

		const legacyBefore = await evm.getAccountInfoExtended(
			legacyColdWallet.mainsailAddress,
			legacyColdWallet.legacyColdWallet.address,
		);
		assert.equal(legacyBefore.balance, legacyColdWallet.legacyColdWallet.balance);

		const fundTx = await EvmCalls.makeEvmCall(context, {
			sender: fundedWallet,
			recipient: legacyColdWallet.mainsailAddress,
			value: 9999n,
		});

		let { accept } = await addTransactionsToPool(context, [fundTx]);
		assert.equal(accept, [0]);

		await waitBlock(context);
		assert.true(await isTransactionCommitted(context, fundTx));

		const legacyAfter = await evm.getAccountInfoExtended(
			legacyColdWallet.mainsailAddress,
			legacyColdWallet.legacyColdWallet.address,
		);
		assert.equal(legacyAfter.balance, legacyBefore.balance + 9999n);

		// Spent legacy balance and check remaining
		const randomWallet = await Utils.getRandomColdWallet(context);
		const spentValue = legacyAfter.balance - ethers.parseUnits("150000", "gwei");
		const spentTx = await EvmCalls.makeEvmCall(context, {
			sender: legacyColdWallet.keyPair,
			recipient: randomWallet.address,
			gasLimit: 30_000,
			gasPrice: 5 * 1e9,
			value: spentValue,
		});

		({ accept } = await addTransactionsToPool(context, [spentTx]));
		assert.equal(accept, [0]);

		await waitBlock(context);
		assert.true(await isTransactionCommitted(context, spentTx));

		const receipt = await getTransactionReceipt(context, spentTx);
		assert.defined(receipt);

		const legacyAfterSpent = await evm.getAccountInfoExtended(
			legacyColdWallet.mainsailAddress,
			legacyColdWallet.legacyColdWallet.address,
		);

		assert.equal(
			legacyAfterSpent.balance,
			legacyAfter.balance -
				spentValue -
				ethers.parseUnits((receipt!.gasUsed * BigInt(spentTx.data.gasPrice)).toString(), "wei"),
		);

		const recipientAfter = await evm.getAccountInfo(randomWallet.address);
		assert.equal(recipientAfter.balance, spentValue);
	});

	it("should not accept legacy cold wallet transaction with insufficient balance", async (context) => {
		const [legacyColdWallet] = context.legacyColdWallets;

		const evm = context.sandbox.app.getTagged<Contracts.Evm.Instance>(Identifiers.Evm.Instance, "instance", "evm");

		const legacyBefore = await evm.getAccountInfoExtended(
			legacyColdWallet.mainsailAddress,
			legacyColdWallet.legacyColdWallet.address,
		);
		assert.equal(legacyBefore.balance, legacyColdWallet.legacyColdWallet.balance);

		const tx = await EvmCalls.makeEvmCall(context, {
			sender: legacyColdWallet.keyPair,
			recipient: legacyColdWallet.mainsailAddress,
			value: legacyColdWallet.legacyColdWallet.balance + 1n,
		});

		const { accept, invalid, errors } = await addTransactionsToPool(context, [tx]);
		assert.equal(accept, []);
		assert.equal(invalid, [0]);
		assert.equal(errors, {
			"0": {
				message: "Insufficient balance in the wallet.",
				type: "ERR_OTHER",
			},
		});
	});

	it("should accept and replace same nonce with higher gas price", async (context) => {
		const randomWallet = await Utils.getRandomColdWallet(context);

		const tx1 = await EvmCalls.makeEvmCall(context, {
			recipient: randomWallet.address,
			gasPrice: 5 * 1e9,
			nonceOffset: 0,
		});
		const tx2 = await EvmCalls.makeEvmCall(context, {
			recipient: randomWallet.address,
			gasPrice: 6 * 1e9,
			nonceOffset: 0,
		});

		let { accept } = await addTransactionsToPool(context, [tx1]);
		assert.equal(accept, [0]);

		({ accept } = await addTransactionsToPool(context, [tx2]));
		assert.equal(accept, [0]);

		await waitBlock(context);

		assert.false(await isTransactionCommitted(context, tx1));
		assert.true(await isTransactionCommitted(context, tx2));
	});

	it("should accept and replace same nonce with higher gas price, but keep subsequent transactions", async (context) => {
		const randomWallet = await Utils.getRandomColdWallet(context);

		const txs: Contracts.Crypto.Transaction[] = [];
		for (let i = 0; i < 10; i++) {
			const tx = await EvmCalls.makeEvmCall(context, {
				recipient: randomWallet.address,
				gasPrice: 5 * 1e9,
				nonceOffset: i,
			});

			txs.push(tx);
		}

		const replacementTx = await EvmCalls.makeEvmCall(context, {
			recipient: randomWallet.address,
			gasPrice: 6 * 1e9,
			nonceOffset: 5,
		});

		let { accept, errors } = await addTransactionsToPool(context, txs);
		assert.equal(accept, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
		assert.undefined(errors);

		// Replace 6th transaction
		({ accept, errors } = await addTransactionsToPool(context, [replacementTx]));
		assert.equal(accept, [0]);
		assert.undefined(errors);

		await waitBlock(context);

		for (let i = 0; i < 10; i++) {
			if (txs[i].data.nonce.isEqualTo(replacementTx.data.nonce)) {
				assert.false(await isTransactionCommitted(context, txs[i]));
				assert.true(await isTransactionCommitted(context, replacementTx));
			} else {
				assert.true(await isTransactionCommitted(context, txs[i]));
			}
		}
	});

	it("should not accept and replace same nonce with same or lower gas price", async (context) => {
		const randomWallet = await Utils.getRandomColdWallet(context);

		const tx1 = await EvmCalls.makeEvmCall(context, {
			recipient: randomWallet.address,
			gasPrice: 5 * 1e9,
			nonceOffset: 0,
		});
		const tx2 = await EvmCalls.makeEvmCall(context, {
			recipient: randomWallet.address,
			gasPrice: 5 * 1e9,
			value: 1n,
			nonceOffset: 0,
		});
		const tx3 = await EvmCalls.makeEvmCall(context, {
			recipient: randomWallet.address,
			gasPrice: 5 * 1e9,
			value: 2n,
			nonceOffset: 0,
		});

		let { accept, invalid } = await addTransactionsToPool(context, [tx1]);
		assert.equal(accept, [0]);

		({ accept, invalid } = await addTransactionsToPool(context, [tx2, tx3]));
		assert.equal(accept, []);
		assert.equal(invalid, [0, 1]);

		await waitBlock(context);

		assert.true(await isTransactionCommitted(context, tx1));
		assert.false(await isTransactionCommitted(context, tx2));
		assert.false(await isTransactionCommitted(context, tx3));
	});

	it("should accept and replace same nonce with higher gas price, but replay subsequent transactions", async (context) => {
		const senderWallet = await Utils.getRandomColdWallet(context);
		const recipientWallet = await Utils.getRandomColdWallet(context);

		// Fund fresh wallet
		const fundTx = await EvmCalls.makeEvmCall(context, {
			recipient: senderWallet.address,
			gasPrice: 5 * 1e9,
			value: ethers.parseEther("1001"),
		});
		await addTransactionsToPool(context, [fundTx]);
		await waitBlock(context);
		assert.true(await isTransactionCommitted(context, fundTx));

		// Send 10 txs each 100 ARK
		const txs: Contracts.Crypto.Transaction[] = [];
		for (let i = 0; i < 10; i++) {
			const tx = await EvmCalls.makeEvmCall(context, {
				sender: senderWallet.keyPair,
				recipient: recipientWallet.address,
				gasPrice: 5 * 1e9,
				value: ethers.parseEther("100"),
				nonceOffset: i,
			});

			txs.push(tx);
		}

		// Replace 6th transaction with 500 ARK, to invalidate all subsequent transactions.
		const replacementTx = await EvmCalls.makeEvmCall(context, {
			sender: senderWallet.keyPair,
			recipient: recipientWallet.address,
			gasPrice: 6 * 1e9,
			value: ethers.parseEther("500"),
			nonceOffset: 5,
		});

		let { accept, errors } = await addTransactionsToPool(context, txs);
		assert.equal(accept, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
		assert.undefined(errors);

		// Replace 5th transaction
		({ accept, errors } = await addTransactionsToPool(context, [replacementTx]));
		assert.equal(accept, [0]);
		assert.undefined(errors);

		await waitBlock(context);

		for (let i = 0; i < 10; i++) {
			if (txs[i].data.nonce.isLessThan(replacementTx.data.nonce)) {
				assert.true(await isTransactionCommitted(context, txs[i]));
			} else if (txs[i].data.nonce.isEqualTo(replacementTx.data.nonce)) {
				assert.false(await isTransactionCommitted(context, txs[i]));
				assert.true(await isTransactionCommitted(context, replacementTx));
			} else {
				assert.false(await isTransactionCommitted(context, txs[i]));
			}
		}
	});

	it("should not accept and replace same nonce with same or lower gas price", async (context) => {
		const randomWallet = await Utils.getRandomColdWallet(context);

		const tx1 = await EvmCalls.makeEvmCall(context, {
			recipient: randomWallet.address,
			gasPrice: 5 * 1e9,
			nonceOffset: 0,
		});
		const tx2 = await EvmCalls.makeEvmCall(context, {
			recipient: randomWallet.address,
			gasPrice: 5 * 1e9,
			value: 1n,
			nonceOffset: 0,
		});

		let { accept, invalid } = await addTransactionsToPool(context, [tx1]);
		assert.equal(accept, [0]);

		({ accept, invalid } = await addTransactionsToPool(context, [tx2]));
		assert.equal(accept, []);
		assert.equal(invalid, [0]);

		await waitBlock(context);

		assert.true(await isTransactionCommitted(context, tx1));
		assert.false(await isTransactionCommitted(context, tx2));
	});
});
