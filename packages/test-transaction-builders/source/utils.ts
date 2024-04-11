import { Contracts, Identifiers } from "@mainsail/contracts";
import { TransactionBuilder, TransactionFactory, Verifier } from "@mainsail/crypto-transaction";
import { TransferBuilder } from "@mainsail/crypto-transaction-transfer";
import { Sandbox } from "@mainsail/test-framework";
import { BigNumber, sleep } from "@mainsail/utils";
import { randomBytes } from "crypto";

import { Context, TransactionOptions } from "./types.js";
import { AcceptAnyTransactionVerifier } from "./verifier.js";

const getNonceByPublicKey = async (sandbox: Sandbox, publicKey: string): Promise<BigNumber> => {
	const { app } = sandbox;
	const { walletRepository } = app.get<Contracts.State.Service>(Identifiers.State.Service).getStore();
	return (await walletRepository.findByPublicKey(publicKey)).getNonce();
};

const applyCustomSignature = async (
	sandbox: Sandbox,
	transaction: Contracts.Crypto.Transaction,
	signature?: string,
) => {
	if (!signature) {
		return;
	}

	const { app } = sandbox;
	const signatureSize = app.getTagged<number>(Identifiers.Cryptography.Signature.Size, "type", "wallet");

	let serialized = transaction.serialized.subarray(0, transaction.serialized.byteLength - signatureSize);
	serialized = Buffer.concat([serialized, Buffer.from(signature, "hex")]);

	transaction.serialized = serialized;
	transaction.data.signature = signature;
};

const applyCustomSignatures = async (
	sandbox: Sandbox,
	transaction: Contracts.Crypto.Transaction,
	{ omitParticipantSignatures, participantSignatures }: TransactionOptions,
) => {
	if (!omitParticipantSignatures || !participantSignatures) {
		return;
	}

	let transactionHex = transaction.serialized.toString("hex");

	omitParticipantSignatures.sort((a, b) => b - a);

	for (const index of omitParticipantSignatures) {
		const signatureToOmit = participantSignatures[index];

		const signatureIndex = transactionHex.indexOf(signatureToOmit);
		transactionHex = transactionHex.slice(0, signatureIndex);

		transaction.data.signatures!.splice(transaction.data.signatures!.indexOf(signatureToOmit), 1);
	}

	transaction.serialized = Buffer.from(transactionHex, "hex");
};

export const buildSignedTransaction = async <TBuilder extends TransactionBuilder<TBuilder>>(
	sandbox: Sandbox,
	builder: TransactionBuilder<TBuilder>,
	keyPair: Contracts.Crypto.KeyPair,
	options: TransactionOptions,
): Promise<Contracts.Crypto.Transaction> => {
	// !! Overwrite verifier to accept invalid schema data
	sandbox.app.rebind(Identifiers.Cryptography.Transaction.Verifier).to(AcceptAnyTransactionVerifier);
	(builder as any).factory = sandbox.app.resolve(TransactionFactory);

	if (options.multiSigKeys) {
		const participants = options.multiSigKeys;
		const multiSigPublicKey = await sandbox.app
			.getTagged<Contracts.Crypto.PublicKeyFactory>(
				Identifiers.Cryptography.Identity.PublicKey.Factory,
				"type",
				"wallet",
			)
			.fromMultiSignatureAsset({
				min: participants.length,
				publicKeys: participants.map((p) => p.publicKey),
			});

		const nonce = await getNonceByPublicKey(sandbox, multiSigPublicKey);

		const { multiSigKeys, nonceOffset = 0 } = options;
		builder = builder.nonce(nonce.plus(1 + nonceOffset).toString()).senderPublicKey(multiSigPublicKey);

		for (const [index, participant] of multiSigKeys.entries()) {
			builder = await builder.multiSignWithKeyPair(participant, index);
		}
	} else {
		const nonce = await getNonceByPublicKey(sandbox, keyPair.publicKey);
		const { nonceOffset = 0 } = options;
		builder = await builder.nonce(nonce.plus(1 + nonceOffset).toString()).signWithKeyPair(keyPair);
	}

	const transaction = await builder.build();

	if (options.signature) {
		await applyCustomSignature(sandbox, transaction, options.signature);
	}

	if (options.omitParticipantSignatures) {
		await applyCustomSignatures(sandbox, transaction, options);
	}

	if (options.callback) {
		// manipulates the buffer, so signature has to be re-calculated
		await options.callback(transaction);

		const signatureFactory = sandbox.app.getTagged<Contracts.Crypto.Signature>(
			Identifiers.Cryptography.Signature.Instance,
			"type",
			"wallet",
		);

		const hashFactory = sandbox.app.get<Contracts.Crypto.HashFactory>(Identifiers.Cryptography.Hash.Factory);
		const transactionHex = transaction.serialized.toString("hex");

		const signatureIndex = transactionHex.indexOf(transaction.data.signature!);
		const dataPart = transactionHex.slice(0, signatureIndex);

		const newSignature = await signatureFactory.sign(
			await hashFactory.sha256(Buffer.from(dataPart, "hex")),
			Buffer.from(keyPair.privateKey, "hex"),
		);

		transaction.serialized = Buffer.from(
			transaction.serialized.toString("hex").replace(transaction.data.signature!, newSignature),
			"hex",
		);
	}

	// !! Reset
	sandbox.app.rebind(Identifiers.Cryptography.Transaction.Verifier).to(Verifier);

	return transaction;
};

export const addTransactionsToPool = async (
	{ sandbox }: { sandbox: Sandbox },
	transactions: Contracts.Crypto.Transaction[],
): Promise<Contracts.TransactionPool.ProcessorResult> => {
	const { app } = sandbox;
	const processor = app.get<Contracts.TransactionPool.Processor>(Identifiers.TransactionPool.Processor);
	return processor.process(transactions.map((t) => t.serialized));
};

export const waitBlock = async (sandbox: Sandbox, count: number = 1) => {
	const state = sandbox.app.get<Contracts.State.Service>(Identifiers.State.Service);

	let currentHeight = state.getStore().getLastHeight();
	const targetHeight = currentHeight + count;

	do {
		await sleep(200);
		currentHeight = state.getStore().getLastHeight();
	} while (currentHeight < targetHeight);
};

export const getRandomFundedWallet = async (
	context: Context,
	amount?: BigNumber,
): Promise<Contracts.Crypto.KeyPair> => {
	if (context.fundedWalletProvider) {
		return context.fundedWalletProvider(context, amount);
	}

	const { sandbox, wallets } = context;
	const { app } = sandbox;

	const seed = randomBytes(32).toString("hex");

	const randomKeyPair = await app
		.getTagged<Contracts.Crypto.KeyPairFactory>(Identifiers.Cryptography.Identity.KeyPair.Factory, "type", "wallet")
		.fromMnemonic(seed);

	const recipient = await app
		.get<Contracts.Crypto.AddressFactory>(Identifiers.Cryptography.Identity.Address.Factory)
		.fromPublicKey(randomKeyPair.publicKey);

	amount = amount ?? BigNumber.make("10000000000");

	const nonce = await getNonceByPublicKey(sandbox, wallets[0].publicKey);

	const fundTx = await (
		await app
			.resolve(TransferBuilder)
			.fee(BigNumber.make("10000000").toFixed())
			.recipientId(recipient)
			.amount(BigNumber.make(amount).toFixed())
			.nonce(nonce.plus(1).toFixed())
			.signWithKeyPair(wallets[0])
	).build();

	await addTransactionsToPool(context, [fundTx]);
	await waitBlock(sandbox);

	return randomKeyPair;
};

export const getRandomConsensusKeyPair = async ({ sandbox }: Context): Promise<Contracts.Crypto.KeyPair> => {
	const { app } = sandbox;

	const seed = Array.from({ length: 12 }).fill(Date.now().toString()).join(" ");

	return app
		.getTagged<Contracts.Crypto.KeyPairFactory>(
			Identifiers.Cryptography.Identity.KeyPair.Factory,
			"type",
			"consensus",
		)
		.fromMnemonic(seed);
};

export const getRandomSignature = async ({ sandbox }: { sandbox: Sandbox }): Promise<string> => {
	const { app } = sandbox;

	const signatureSize = app.getTagged<number>(Identifiers.Cryptography.Signature.Size, "type", "wallet");

	return randomBytes(signatureSize).toString("hex");
};

export const getRandomUsername = (): string => `validator_${Date.now().toString()}`.slice(0, 20);
export const getRandomColdWallet = async ({
	sandbox,
}: {
	sandbox: Sandbox;
}): Promise<{
	keyPair: Contracts.Crypto.KeyPair;
	address: string;
}> => {
	const { app } = sandbox;
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

export const getAddressByPublicKey = async ({ sandbox }: { sandbox: Sandbox }, publicKey: string): Promise<string> => {
	const { app } = sandbox;
	return app
		.get<Contracts.Crypto.AddressFactory>(Identifiers.Cryptography.Identity.Address.Factory)
		.fromPublicKey(publicKey);
};

export const getMultiSignatureWallet = async (
	{ sandbox }: { sandbox: Sandbox },
	asset: Contracts.Crypto.MultiSignatureAsset,
): Promise<Contracts.State.Wallet> => {
	const { app } = sandbox;

	const multiSigPublicKey = await app
		.getTagged<Contracts.Crypto.PublicKeyFactory>(
			Identifiers.Cryptography.Identity.PublicKey.Factory,
			"type",
			"wallet",
		)
		.fromMultiSignatureAsset(asset);

	const { walletRepository } = app.get<Contracts.State.Service>(Identifiers.State.Service).getStore();
	return walletRepository.findByPublicKey(multiSigPublicKey);
};
