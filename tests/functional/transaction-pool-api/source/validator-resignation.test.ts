import { Contracts } from "@mainsail/contracts";
import { describe, Sandbox } from "@mainsail/test-framework";
import { ConsensusAbi, parseTransactionError } from "@mainsail/evm-contracts";
import { EvmCalls, Utils } from "@mainsail/test-transaction-builders";
import { setup, shutdown } from "./setup.js";
import { Snapshot, takeSnapshot } from "./snapshot.js";
import {
	addTransactionsToPool,
	getTransactionReceipt,
	getWallets,
	isTransactionCommitted,
	waitBlock,
	getRandomConsensusKeyPair,
} from "./utilities.js";
import { decodeErrorResult, decodeEventLog, Hex, parseEther, toHex } from "viem";

describe<{
	sandbox: Sandbox;
	snapshot: Snapshot;
	wallets: Contracts.Crypto.KeyPair[];
	legacyColdWallets: {
		keyPair: Contracts.Crypto.KeyPair;
		mainsailAddress: string;
	}[];
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

	it("should accept and commit validator resignation", async (context) => {
		const randomWallet = await Utils.getRandomColdWallet(context);

		const fundTx = await EvmCalls.makeEvmCall(context, {
			recipient: randomWallet.address,
			value: parseEther("300"),
		});
		await addTransactionsToPool(context, [fundTx]);
		await waitBlock(context);

		const { publicKey: validatorPublicKey } = await getRandomConsensusKeyPair(context);
		let tx = await EvmCalls.makeValidatorRegistration(context, {
			sender: randomWallet.keyPair,
			validatorPublicKey,
		});

		let { accept } = await addTransactionsToPool(context, [tx]);
		assert.equal(accept, [0]);

		await waitBlock(context);
		assert.true(await isTransactionCommitted(context, tx));

		// Resign
		tx = await EvmCalls.makeValidatorResignation(context, {
			sender: randomWallet.keyPair,
		});

		({ accept } = await addTransactionsToPool(context, [tx]));
		assert.equal(accept, [0]);

		await waitBlock(context);
		assert.true(await isTransactionCommitted(context, tx));

		const receipt = await getTransactionReceipt(context, tx);
		assert.defined(receipt);
		assert.equal(receipt!.status, 1);

		const decoded = decodeEventLog({
			abi: ConsensusAbi.abi,
			eventName: "ValidatorResigned",
			data: receipt?.logs[0].data as Hex,
			topics: receipt?.logs[0].topics,
		});

		assert.equal(decoded.args, {
			addr: randomWallet.address,
		});
	});

	it("should accept and fail validator resignation if already resigned", async (context) => {
		const randomWallet = await Utils.getRandomColdWallet(context);

		const fundTx = await EvmCalls.makeEvmCall(context, {
			recipient: randomWallet.address,
			value: parseEther("300"),
		});
		await addTransactionsToPool(context, [fundTx]);
		await waitBlock(context);

		const { publicKey: validatorPublicKey } = await getRandomConsensusKeyPair(context);
		let tx = await EvmCalls.makeValidatorRegistration(context, {
			sender: randomWallet.keyPair,
			validatorPublicKey,
		});

		let { accept } = await addTransactionsToPool(context, [tx]);
		assert.equal(accept, [0]);

		await waitBlock(context);
		assert.true(await isTransactionCommitted(context, tx));

		// Resign first time
		tx = await EvmCalls.makeValidatorResignation(context, {
			sender: randomWallet.keyPair,
		});

		({ accept } = await addTransactionsToPool(context, [tx]));
		assert.equal(accept, [0]);

		await waitBlock(context);
		assert.true(await isTransactionCommitted(context, tx));

		let receipt = await getTransactionReceipt(context, tx);
		assert.defined(receipt);
		assert.equal(receipt!.status, 1);

		// Resign second time fails
		tx = await EvmCalls.makeValidatorResignation(context, {
			sender: randomWallet.keyPair,
		});

		({ accept } = await addTransactionsToPool(context, [tx]));
		assert.equal(accept, [0]);

		await waitBlock(context);
		assert.true(await isTransactionCommitted(context, tx));

		receipt = await getTransactionReceipt(context, tx);
		assert.defined(receipt);
		assert.equal(receipt!.status, 0);

		const error = parseTransactionError(tx, receipt!);
		assert.equal(error, "ValidatorAlreadyResigned");
	});

	it("should accept and fail validator resignation if not registerd", async (context) => {
		const randomWallet = await Utils.getRandomColdWallet(context);

		const fundTx = await EvmCalls.makeEvmCall(context, {
			recipient: randomWallet.address,
			value: parseEther("300"),
		});
		await addTransactionsToPool(context, [fundTx]);
		await waitBlock(context);

		// Resign
		let tx = await EvmCalls.makeValidatorResignation(context, {
			sender: randomWallet.keyPair,
		});

		let { accept } = await addTransactionsToPool(context, [tx]);
		assert.equal(accept, [0]);

		await waitBlock(context);
		assert.true(await isTransactionCommitted(context, tx));

		let receipt = await getTransactionReceipt(context, tx);
		assert.defined(receipt);
		assert.equal(receipt!.status, 0);

		const error = parseTransactionError(tx, receipt!);
		assert.equal(error, "CallerIsNotValidator");
	});
});
