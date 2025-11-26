import type { Contracts } from "@mainsail/contracts";
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

	it("should accept and commit validator registration", async (context) => {
		const randomWallet = await Utils.getRandomColdWallet(context);

		const fundTx = await EvmCalls.makeEvmCall(context, {
			recipient: randomWallet.address,
			value: parseEther("300"),
		});
		await addTransactionsToPool(context, [fundTx]);
		await waitBlock(context);

		const { publicKey: validatorPublicKey } = await getRandomConsensusKeyPair(context);
		const tx = await EvmCalls.makeValidatorRegistration(context, {
			sender: randomWallet.keyPair,
			validatorPublicKey,
		});

		const { accept } = await addTransactionsToPool(context, [tx]);
		assert.equal(accept, [0]);

		await waitBlock(context);
		assert.true(await isTransactionCommitted(context, tx));

		const receipt = await getTransactionReceipt(context, tx);
		assert.defined(receipt);
		assert.equal(receipt!.status, 1);

		const decoded = decodeEventLog({
			abi: ConsensusAbi.abi,
			eventName: "ValidatorRegistered",
			data: receipt?.logs[0].data as Hex,
			topics: receipt?.logs[0].topics ?? [],
		});

		assert.equal(decoded.args, {
			addr: randomWallet.address,
			blsPublicKey: `0x${validatorPublicKey}`,
		});
	});

	it("should accept and fail validator registration if already validator", async (context) => {
		const randomWallet = await Utils.getRandomColdWallet(context);

		const fundTx = await EvmCalls.makeEvmCall(context, {
			recipient: randomWallet.address,
			value: parseEther("1000"),
		});
		await addTransactionsToPool(context, [fundTx]);
		await waitBlock(context);

		// Register first time
		const { publicKey: validatorPublicKey } = await getRandomConsensusKeyPair(context);
		let tx = await EvmCalls.makeValidatorRegistration(context, {
			sender: randomWallet.keyPair,
			validatorPublicKey,
		});

		let { accept } = await addTransactionsToPool(context, [tx]);
		assert.equal(accept, [0]);

		await waitBlock(context);
		assert.true(await isTransactionCommitted(context, tx));
		let receipt = await getTransactionReceipt(context, tx);
		assert.defined(receipt);
		assert.equal(receipt!.status, 1);

		// Register second time (different key)
		const { publicKey: validatorPublicKey2 } = await getRandomConsensusKeyPair(context);
		tx = await EvmCalls.makeValidatorRegistration(context, {
			sender: randomWallet.keyPair,
			validatorPublicKey: validatorPublicKey2,
		});

		({ accept } = await addTransactionsToPool(context, [tx]));
		assert.equal(accept, [0]);

		await waitBlock(context);
		assert.true(await isTransactionCommitted(context, tx));

		receipt = await getTransactionReceipt(context, tx);
		assert.defined(receipt);
		assert.equal(receipt!.status, 0);

		const error = parseTransactionError(tx, receipt!);
		assert.equal(error, "ValidatorAlreadyRegistered");
	});

	it("should accept and fail validator registration if already used by another validator", async (context) => {
		const randomWallet1 = await Utils.getRandomColdWallet(context);
		const randomWallet2 = await Utils.getRandomColdWallet(context);

		for (const wallet of [randomWallet1, randomWallet2]) {
			const fundTx = await EvmCalls.makeEvmCall(context, {
				recipient: wallet.address,
				value: parseEther("1000"),
			});
			await addTransactionsToPool(context, [fundTx]);
			await waitBlock(context);
		}

		const { publicKey: validatorPublicKey } = await getRandomConsensusKeyPair(context);

		// Register key first time with wallet 1
		let tx = await EvmCalls.makeValidatorRegistration(context, {
			sender: randomWallet1.keyPair,
			validatorPublicKey,
		});

		let { accept } = await addTransactionsToPool(context, [tx]);
		assert.equal(accept, [0]);

		await waitBlock(context);
		assert.true(await isTransactionCommitted(context, tx));
		let receipt = await getTransactionReceipt(context, tx);
		assert.defined(receipt);
		assert.equal(receipt!.status, 1);

		// Register key second time with wallet 2
		tx = await EvmCalls.makeValidatorRegistration(context, {
			sender: randomWallet2.keyPair,
			validatorPublicKey,
		});

		({ accept } = await addTransactionsToPool(context, [tx]));
		assert.equal(accept, [0]);

		await waitBlock(context);
		assert.true(await isTransactionCommitted(context, tx));

		receipt = await getTransactionReceipt(context, tx);
		assert.defined(receipt);
		assert.equal(receipt!.status, 0);

		const error = parseTransactionError(tx, receipt!);
		assert.equal(error, "BlsKeyAlreadyRegistered");
	});
});
