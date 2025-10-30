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
import { decodeEventLog, Hex, parseEther } from "viem";

describe<{
	sandbox: Sandbox;
	snapshot: Snapshot;
	wallets: Contracts.Crypto.KeyPair[];
	legacyColdWallets: {
		keyPair: Contracts.Crypto.KeyPair;
		mainsailAddress: string;
	}[];
}>("Vote", ({ beforeEach, afterEach, it, assert }) => {
	beforeEach(async (context) => {
		context.sandbox = await setup();
		context.wallets = await getWallets(context.sandbox);
		context.snapshot = await takeSnapshot(context.sandbox);
	});

	afterEach(async ({ sandbox, snapshot }) => {
		await snapshot.validate();

		await shutdown(sandbox);
	});

	it("should accept and commit validator vote", async (context) => {
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

		// Self vote
		tx = await EvmCalls.makeValidatorVote(context, {
			sender: randomWallet.keyPair,
			vote: randomWallet.address,
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
			eventName: "Voted",
			data: receipt?.logs[0].data as Hex,
			topics: receipt?.logs[0].topics,
		});

		assert.equal(decoded.args, {
			voter: randomWallet.address,
			validator: randomWallet.address,
		});
	});

	it("should accept and commit validator unvote", async (context) => {
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

		// Self vote
		tx = await EvmCalls.makeValidatorVote(context, {
			sender: randomWallet.keyPair,
			vote: randomWallet.address,
		});

		({ accept } = await addTransactionsToPool(context, [tx]));
		assert.equal(accept, [0]);

		await waitBlock(context);
		assert.true(await isTransactionCommitted(context, tx));

		let receipt = await getTransactionReceipt(context, tx);
		assert.defined(receipt);
		assert.equal(receipt!.status, 1);

		// Unvote
		tx = await EvmCalls.makeValidatorUnvote(context, {
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
			abi: ConsensusAbi.abi,
			eventName: "Unvoted",
			data: receipt?.logs[0].data as Hex,
			topics: receipt?.logs[0].topics,
		});

		assert.equal(decoded.args, {
			voter: randomWallet.address,
			validator: randomWallet.address,
		});
	});

	it("should accept and reject vote if already voted", async (context) => {
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

		// Self vote
		tx = await EvmCalls.makeValidatorVote(context, {
			sender: randomWallet.keyPair,
			vote: randomWallet.address,
		});

		({ accept } = await addTransactionsToPool(context, [tx]));
		assert.equal(accept, [0]);

		await waitBlock(context);
		assert.true(await isTransactionCommitted(context, tx));

		let receipt = await getTransactionReceipt(context, tx);
		assert.defined(receipt);
		assert.equal(receipt!.status, 1);

		// Vote again
		tx = await EvmCalls.makeValidatorVote(context, {
			sender: randomWallet.keyPair,
			vote: randomWallet.address,
		});

		({ accept } = await addTransactionsToPool(context, [tx]));
		assert.equal(accept, [0]);

		await waitBlock(context);
		assert.true(await isTransactionCommitted(context, tx));

		receipt = await getTransactionReceipt(context, tx);
		assert.defined(receipt);
		assert.equal(receipt!.status, 0);

		const error = parseTransactionError(tx, receipt!);
		assert.equal(error, "VoteSameValidator");
	});

	it.only("should accept and vote swap", async (context) => {
		const [validator1] = context.wallets;
		const validatorAddress = await Utils.getAddressByPublicKey(context, validator1.publicKey);

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

		// Self vote
		tx = await EvmCalls.makeValidatorVote(context, {
			sender: randomWallet.keyPair,
			vote: randomWallet.address,
		});

		({ accept } = await addTransactionsToPool(context, [tx]));
		assert.equal(accept, [0]);

		await waitBlock(context);
		assert.true(await isTransactionCommitted(context, tx));

		let receipt = await getTransactionReceipt(context, tx);
		assert.defined(receipt);
		assert.equal(receipt!.status, 1);

		// Vote someone else
		tx = await EvmCalls.makeValidatorVote(context, {
			sender: randomWallet.keyPair,
			vote: validatorAddress,
		});

		({ accept } = await addTransactionsToPool(context, [tx]));
		assert.equal(accept, [0]);

		await waitBlock(context);
		assert.true(await isTransactionCommitted(context, tx));

		receipt = await getTransactionReceipt(context, tx);
		assert.defined(receipt);
		assert.equal(receipt!.status, 1);

		const decoded = decodeEventLog({
			abi: ConsensusAbi.abi,
			eventName: "Voted",
			data: receipt?.logs[0].data as Hex,
			topics: receipt?.logs[0].topics,
		});

		assert.equal(decoded.args, {
			voter: randomWallet.address,
			validator: validatorAddress,
		});
	});
});
