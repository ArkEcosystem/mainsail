import { Identifiers } from "@mainsail/constants";
import type { Contracts } from "@mainsail/contracts";
import { TransactionBuilder, TransactionFactory, Verifier } from "@mainsail/crypto-transaction";
import { BigNumber, sleep } from "@mainsail/utils";
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

	transaction.serialized = serialized;

	// TODO
	//transaction.data.signature = signature;
};

const applyCustomSignatures = async (
	app: Contracts.Kernel.Application,
	transaction: Contracts.Crypto.Transaction,
	{ omitParticipantSignatures, participantSignatures }: TransactionOptions,
) => {
	throw new Error("unsupported");
	// if (!omitParticipantSignatures || !participantSignatures) {
	// 	return;
	// }

	// let transactionHex = transaction.serialized.toString("hex");

	// omitParticipantSignatures.sort((a, b) => b - a);

	// for (const index of omitParticipantSignatures) {
	// 	const signatureToOmit = participantSignatures[index];

	// 	const signatureIndex = transactionHex.indexOf(signatureToOmit);
	// 	transactionHex = transactionHex.slice(0, signatureIndex);

	// 	transaction.data.signatures!.splice(transaction.data.signatures!.indexOf(signatureToOmit), 1);
	// }

	// transaction.serialized = Buffer.from(transactionHex, "hex");
};

export const getNonceByPublicKey = async (app: Contracts.Kernel.Application, publicKey: string): Promise<BigNumber> => {
	const address = await app
		.get<Contracts.Crypto.AddressFactory>(Identifiers.Cryptography.Identity.Address.Factory)
		.fromPublicKey(publicKey);

	const instance = app.getTagged<Contracts.Evm.Instance>(Identifiers.Evm.Instance, "instance", "evm");
	const accountInfo = await instance.getAccountInfo(address);

	return BigNumber.make(accountInfo.nonce);
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

	if (options.multiSigKeys) {
		throw new Error("unsupported");
		// const participants = options.multiSigKeys;
		// const multiSigPublicKey = await app
		// 	.getTagged<Contracts.Crypto.PublicKeyFactory>(
		// 		Identifiers.Cryptography.Identity.PublicKey.Factory,
		// 		"type",
		// 		"wallet",
		// 	)
		// 	.fromMultiSignatureAsset({
		// 		min: participants.length,
		// 		publicKeys: participants.map((p) => p.publicKey),
		// 	});

		// const nonce = await getNonceByPublicKey(app, multiSigPublicKey);

		// const { multiSigKeys, nonceOffset = 0 } = options;
		// builder = builder.nonce(nonce.plus(nonceOffset).toString()).senderPublicKey(multiSigPublicKey);

		// for (const [index, participant] of multiSigKeys.entries()) {
		// 	builder = await builder.multiSignWithKeyPair(participant, index);
		// }
	} else {
		const nonce = await getNonceByPublicKey(app, keyPair.publicKey);
		const { nonceOffset = 0 } = options;
		builder = await builder.nonce(nonce.plus(nonceOffset).toString()).signWithKeyPair(keyPair);
	}

	const transaction = await builder.build();

	if (options.signature) {
		await applyCustomSignature(app, transaction, options.signature);
	}

	if (options.omitParticipantSignatures) {
		await applyCustomSignatures(app, transaction, options);
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
	{ app }: { app: Contracts.Kernel.Application, },
	transactions: Contracts.Crypto.Transaction[],
): Promise<Contracts.TransactionPool.ProcessorResult> => {
	const processor = app.get<Contracts.TransactionPool.Processor>(Identifiers.TransactionPool.Processor);
	return processor.process(transactions.map((t) => t.serialized));
};

export const waitBlock = async (app: Contracts.Kernel.Application, count: number = 1): Promise<void> => {
	const state = app.get<Contracts.State.Store>(Identifiers.State.Store);

	let currentBlockNumber = state.getBlockNumber();
	const targetBlockNumber = currentBlockNumber + count;

	do {
		await sleep(200);
		currentBlockNumber = state.getBlockNumber();
	} while (currentBlockNumber < targetBlockNumber);
};

export const getRandomFundedWallet = async (
	context: Context,
	amount?: BigNumber,
): Promise<Contracts.Crypto.KeyPair> => {
	if (context.fundedWalletProvider) {
		return context.fundedWalletProvider(context, amount);
	}

	const { app, wallets } = context;

	//const seed = randomBytes(32).toString("hex");

	const randomKeyPair = await app
		.getTagged<Contracts.Crypto.KeyPairFactory>(Identifiers.Cryptography.Identity.KeyPair.Factory, "type", "wallet")
		.fromMnemonic("ladder pet busy silver convince lens either observe gap program debate film");

	const recipient = await app
		.get<Contracts.Crypto.AddressFactory>(Identifiers.Cryptography.Identity.Address.Factory)
		.fromPublicKey(randomKeyPair.publicKey);
	amount = amount ?? BigNumber.make("1000000000000000000");

	const nonce = await getNonceByPublicKey(app, wallets[0].publicKey);

	const fundTx = await (
		await app
			.resolve(TransactionBuilder)
			.gasPrice(5)
			.recipientAddress(recipient)
			.value(BigNumber.make(amount).toFixed())
			.nonce(nonce.plus(1).toFixed())
			.signWithKeyPair(wallets[0])
	).build();

	await addTransactionsToPool(context, [fundTx]);
	await waitBlock(app);
	await waitBlock(app); // Await 2 blocks to ensure the transaction is confirmed

	return randomKeyPair;
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

export const getAddressByPublicKey = async ({ app }: { app: Contracts.Kernel.Application, }, publicKey: string): Promise<string> => app
	.get<Contracts.Crypto.AddressFactory>(Identifiers.Cryptography.Identity.Address.Factory)
	.fromPublicKey(publicKey);
