import type { Contracts } from "@mainsail/contracts";
import { describe, Sandbox } from "@mainsail/test-framework";
import { parseTransactionError, UsernamesAbi } from "@mainsail/evm-contracts";
import { EvmCalls, Utils } from "@mainsail/test-transaction-builders";
import { setup, shutdown } from "./setup.js";
import { Snapshot, takeSnapshot } from "./snapshot.js";
import {
	addTransactionsToPool,
	getTransactionReceipt,
	getWallets,
	isTransactionCommitted,
	waitBlock,
} from "./utilities.js";
import { decodeEventLog, Hex, parseEther } from "viem";

describe<{
	sandbox: Sandbox;
	snapshot: Snapshot;
	wallets: Contracts.Crypto.KeyPair[];
	legacyColdWallets: {
		keyPair: Contracts.Crypto.KeyPair;
		mainsailAddress: string;
	}[];
}>("Usernames", ({ beforeEach, afterEach, it, assert }) => {
	beforeEach(async (context) => {
		context.sandbox = await setup();
		context.wallets = await getWallets(context.sandbox);
		context.snapshot = await takeSnapshot(context.sandbox);
	});

	afterEach(async ({ sandbox, snapshot }) => {
		await snapshot.validate();

		await shutdown(sandbox);
	});

	it("should accept and commit username registration", async (context) => {
		const randomWallet = await Utils.getRandomColdWallet(context);

		const fundTx = await EvmCalls.makeEvmCall(context, {
			recipient: randomWallet.address,
			value: parseEther("300"),
		});
		await addTransactionsToPool(context, [fundTx]);
		await waitBlock(context);

		const tx = await EvmCalls.makeUsernameRegistration(context, {
			sender: randomWallet.keyPair,
			username: "bob",
		});

		const { accept } = await addTransactionsToPool(context, [tx]);
		assert.equal(accept, [0]);

		await waitBlock(context);
		assert.true(await isTransactionCommitted(context, tx));

		const receipt = await getTransactionReceipt(context, tx);
		assert.defined(receipt);
		assert.equal(receipt!.status, 1);

		const decoded = decodeEventLog({
			abi: UsernamesAbi.abi,
			eventName: "UsernameRegistered",
			data: receipt?.logs[0].data as Hex,
			topics: receipt?.logs[0].topics ?? [],
		});

		assert.equal(decoded.args, {
			addr: randomWallet.address,
			username: "bob",
			previousUsername: "",
		});
	});

	it("should accept and commit username resignation", async (context) => {
		const randomWallet = await Utils.getRandomColdWallet(context);

		const fundTx = await EvmCalls.makeEvmCall(context, {
			recipient: randomWallet.address,
			value: parseEther("300"),
		});
		await addTransactionsToPool(context, [fundTx]);
		await waitBlock(context);

		let tx = await EvmCalls.makeUsernameRegistration(context, {
			sender: randomWallet.keyPair,
			username: "bob",
		});

		let { accept } = await addTransactionsToPool(context, [tx]);
		assert.equal(accept, [0]);

		await waitBlock(context);
		assert.true(await isTransactionCommitted(context, tx));

		let receipt = await getTransactionReceipt(context, tx);
		assert.defined(receipt);
		assert.equal(receipt!.status, 1);

		// Resign
		tx = await EvmCalls.makeUsernameResignation(context, {
			sender: randomWallet.keyPair,
		});

		({ accept } = await addTransactionsToPool(context, [tx]));
		assert.equal(accept, [0]);

		await waitBlock(context);
		assert.true(await isTransactionCommitted(context, tx));

		receipt = await getTransactionReceipt(context, tx);
		assert.defined(receipt);
		assert.equal(receipt!.status, 1);

		const decoded = decodeEventLog({
			abi: UsernamesAbi.abi,
			eventName: "UsernameResigned",
			data: receipt?.logs[0].data as Hex,
			topics: receipt?.logs[0].topics ?? [],
		});

		assert.equal(decoded.args, {
			addr: randomWallet.address,
			username: "bob",
		});
	});

	it("should accept and reject username registration if already registered", async (context) => {
		const randomWallet = await Utils.getRandomColdWallet(context);

		const fundTx = await EvmCalls.makeEvmCall(context, {
			recipient: randomWallet.address,
			value: parseEther("300"),
		});
		await addTransactionsToPool(context, [fundTx]);
		await waitBlock(context);

		let tx = await EvmCalls.makeUsernameRegistration(context, {
			sender: randomWallet.keyPair,
			username: "bob",
		});

		let { accept } = await addTransactionsToPool(context, [tx]);
		assert.equal(accept, [0]);

		await waitBlock(context);
		assert.true(await isTransactionCommitted(context, tx));

		let receipt = await getTransactionReceipt(context, tx);
		assert.defined(receipt);
		assert.equal(receipt!.status, 1);

		// Register again
		tx = await EvmCalls.makeUsernameRegistration(context, {
			sender: randomWallet.keyPair,
			username: "bob",
		});

		({ accept } = await addTransactionsToPool(context, [tx]));
		assert.equal(accept, [0]);

		await waitBlock(context);
		assert.true(await isTransactionCommitted(context, tx));

		receipt = await getTransactionReceipt(context, tx);
		assert.defined(receipt);
		assert.equal(receipt!.status, 0);

		const error = parseTransactionError(tx, receipt!);
		assert.equal(error, "TakenUsername");
	});
});
