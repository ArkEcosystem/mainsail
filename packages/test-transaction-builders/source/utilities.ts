import type { Contracts } from "@mainsail/contracts";

import { Identifiers } from "@mainsail/constants";
import { TransactionBuilder, TransactionFactory, Verifier } from "@mainsail/crypto-transaction";
import { sleep } from "@mainsail/utils";
import { randomBytes } from "crypto";

import type { Context, TransactionOptions } from "./types.js";

import { AcceptAnyTransactionVerifier } from "./verifier.js";

const applyCustomSignature = async (
	app: Contracts.Kernel.Application,
	transaction: Contracts.Crypto.Transaction,
	signature?: string,
) => {
	if (!signature) {
		return;
	}

	const signatureSize = app.getTagged<number>(Identifiers.Cryptography.Signature.Size, "type", "wallet");

	let serialized = transaction.serialized.subarray(0, transaction.serialized.byteLength - signatureSize);
	serialized = Buffer.concat([serialized, Buffer.from(signature, "hex")]);

	// @ts-ignore
	transaction.serialized = serialized;

	// TODO
	//transaction.data.signature = signature;
};

export const getNonceByPublicKey = async (app: Contracts.Kernel.Application, publicKey: string): Promise<bigint> => {
	const address = await app
		.get<Contracts.Crypto.AddressFactory>(Identifiers.Cryptography.Identity.Address.Factory)
		.fromPublicKey(publicKey);

	const instance = app.getTagged<Contracts.Evm.Instance>(Identifiers.Evm.Instance, "instance", "evm");
	const accountInfo = await instance.getAccountInfo(address);

	return accountInfo.nonce;
};

export const buildSignedTransaction = async <TBuilder extends TransactionBuilder>(
	app: Contracts.Kernel.Application,
	builder: TransactionBuilder,
	keyPair: Contracts.Crypto.KeyPair,
	options: TransactionOptions,
): Promise<Contracts.Crypto.Transaction> => {
	// !! Overwrite verifier to accept invalid schema data
	app.rebind(Identifiers.Cryptography.Transaction.Verifier).to(AcceptAnyTransactionVerifier);
	(builder as unknown as { factory: TransactionFactory }).factory = app.resolve(TransactionFactory);
	(builder as unknown as { verifier: Contracts.Crypto.TransactionVerifier }).verifier =
		app.resolve(AcceptAnyTransactionVerifier);

	const nonce = await getNonceByPublicKey(app, keyPair.publicKey);
	const { nonceOffset = 0 } = options;
	builder = await builder.nonce((nonce + BigInt(nonceOffset)).toString()).signWithKeyPair(keyPair);

	const transaction = await builder.build();

	if (options.signature) {
		await applyCustomSignature(app, transaction, options.signature);
	}

	if (options.callback) {
		throw new Error("unsupported");
		// TODO
		// manipulates the buffer, so signature has to be re-calculated
		//		await options.callback(transaction);

		// const signatureFactory = app.getTagged<Contracts.Crypto.Signature>(
		// 	Identifiers.Cryptography.Signature.Instance,
		// 	"type",
		// 	"wallet",
		// );

		// const hashFactory = app.get<Contracts.Crypto.HashFactory>(Identifiers.Cryptography.Hash.Factory);
		// const transactionHex = transaction.serialized.toString("hex");

		// const signatureIndex = transactionHex.indexOf(transaction.data.signature!);
		// const dataPart = transactionHex.slice(0, signatureIndex);

		// const newSignature = await signatureFactory.sign(
		// 	await hashFactory.sha256(Buffer.from(dataPart, "hex")),
		// 	Buffer.from(keyPair.privateKey, "hex"),
		// );

		// transaction.serialized = Buffer.from(
		// 	transaction.serialized.toString("hex").replace(transaction.data.signature!, newSignature),
		// 	"hex",
		// );
	}

	// !! Reset
	app.rebind(Identifiers.Cryptography.Transaction.Verifier).to(Verifier);
	(builder as unknown as { factory: TransactionFactory }).factory = app.get(
		Identifiers.Cryptography.Transaction.Factory,
	);
	(builder as unknown as { verifier: Contracts.Crypto.TransactionVerifier }).verifier = app.get(
		Identifiers.Cryptography.Transaction.Verifier,
	);

	return transaction;
};

export const addTransactionsToPool = async (
	{ app }: { app: Contracts.Kernel.Application },
	transactions: Contracts.Crypto.Transaction[],
): Promise<Contracts.TransactionPool.ProcessorResult> => {
	const processor = app.get<Contracts.TransactionPool.Processor>(Identifiers.TransactionPool.Processor);
	return processor.process(transactions.map((t) => t.serialized));
};

export const waitBlock = async ({ app }: { app: Contracts.Kernel.Application }, count: number = 1): Promise<void> => {
	// Hard upper bound for a single waitBlock call.
	const WAIT_BLOCK_TIMEOUT_MS = 30_000;
	// If no new block is committed for this long the chain is stuck — fail fast.
	const WAIT_BLOCK_STALL_MS = 10_000;
	// Poll faster than the block time so we never sample across a whole block interval.
	const WAIT_BLOCK_POLL_MS = 25;

	const store = app.get<Contracts.State.Store>(Identifiers.State.Store);
	const query = app.get<Contracts.TransactionPool.Query>(Identifiers.TransactionPool.Query);

	const poolSize = async (): Promise<number> => (await query.getAll().all()).length;

	const startBlockNumber = store.getBlockNumber();
	const targetBlockNumber = startBlockNumber + count;

	// First block number at which the pool was observed empty (-1 = not yet observed).
	// Seeded from the entry sample so a fully-drained pool at entry is handled too.
	let firstEmptyBlockNumber = (await poolSize()) === 0 ? startBlockNumber : -1;

	const startedAt = Date.now();
	let lastBlockNumber = startBlockNumber;
	let lastProgressAt = startedAt;

	for (;;) {
		const currentBlockNumber = store.getBlockNumber();
		if (currentBlockNumber > lastBlockNumber) {
			lastBlockNumber = currentBlockNumber;
			lastProgressAt = Date.now();
		}

		const pending = await poolSize();
		if (pending === 0 && firstEmptyBlockNumber < 0) {
			firstEmptyBlockNumber = currentBlockNumber;
		}

		const advancedEnough = currentBlockNumber >= targetBlockNumber;
		const poolDrained = pending === 0;

		// A block committed strictly after we first saw the pool empty => the block that
		// swept the last pending txs is committed and queryable.
		const inFlightSwept = firstEmptyBlockNumber >= 0 && currentBlockNumber > firstEmptyBlockNumber;
		if (advancedEnough && poolDrained && inFlightSwept) {
			break;
		}

		const now = Date.now();
		if (now - startedAt > WAIT_BLOCK_TIMEOUT_MS) {
			throw new Error(
				`waitBlock timed out after ${WAIT_BLOCK_TIMEOUT_MS}ms ` +
					`(start=${startBlockNumber}, target=${targetBlockNumber}, current=${currentBlockNumber}, pending=${pending})`,
			);
		}
		if (now - lastProgressAt > WAIT_BLOCK_STALL_MS) {
			throw new Error(
				`waitBlock: no block committed for ${WAIT_BLOCK_STALL_MS}ms — consensus appears stalled ` +
					`(current=${currentBlockNumber}, target=${targetBlockNumber}, pending=${pending})`,
			);
		}

		await sleep(WAIT_BLOCK_POLL_MS);
	}

	if (app.isBound(Identifiers.ApiSync.Service)) {
		await app.get<Contracts.ApiSync.Service>(Identifiers.ApiSync.Service).flush();
	}
};

export const getRandomConsensusKeyPair = async ({ app }: Context): Promise<Contracts.Crypto.KeyPair> => {
	const seed = Array.from({ length: 12 }).fill(Date.now().toString()).join(" ");

	return app
		.getTagged<Contracts.Crypto.KeyPairFactory>(
			Identifiers.Cryptography.Identity.KeyPair.Factory,
			"type",
			"consensus",
		)
		.fromMnemonic(seed);
};

export const getRandomSignature = async ({ app }: { app: Contracts.Kernel.Application }): Promise<string> => {
	const signatureSize = app.getTagged<number>(Identifiers.Cryptography.Signature.Size, "type", "wallet");

	return randomBytes(signatureSize).toString("hex");
};

export const getRandomUsername = (): string => `validator_${Date.now().toString()}`.slice(0, 20);
export const getRandomColdWallet = async ({
	app,
}: {
	app: Contracts.Kernel.Application;
}): Promise<{
	keyPair: Contracts.Crypto.KeyPair;
	address: string;
}> => {
	const seed = Math.random().toString();

	const randomKeyPair = await app
		.getTagged<Contracts.Crypto.KeyPairFactory>(Identifiers.Cryptography.Identity.KeyPair.Factory, "type", "wallet")
		.fromMnemonic(seed);

	return {
		address: await app
			.get<Contracts.Crypto.AddressFactory>(Identifiers.Cryptography.Identity.Address.Factory)
			.fromPublicKey(randomKeyPair.publicKey),
		keyPair: randomKeyPair,
	};
};

export const getAddressByPublicKey = async (
	{ app }: { app: Contracts.Kernel.Application },
	publicKey: string,
): Promise<string> =>
	app
		.get<Contracts.Crypto.AddressFactory>(Identifiers.Cryptography.Identity.Address.Factory)
		.fromPublicKey(publicKey);
