import { Contracts, Identifiers } from "@mainsail/contracts";
import { TransactionBuilder } from "@mainsail/crypto-transaction";
import { MultiPaymentBuilder } from "@mainsail/crypto-transaction-multi-payment";
import { MultiSignatureBuilder } from "@mainsail/crypto-transaction-multi-signature-registration";
import { TransferBuilder } from "@mainsail/crypto-transaction-transfer";
import { UsernameRegistrationBuilder } from "@mainsail/crypto-transaction-username-registration";
import { UsernameResignationBuilder } from "@mainsail/crypto-transaction-username-resignation";
import { ValidatorRegistrationBuilder } from "@mainsail/crypto-transaction-validator-registration";
import { ValidatorResignationBuilder } from "@mainsail/crypto-transaction-validator-resignation";
import { VoteBuilder } from "@mainsail/crypto-transaction-vote";
import { Sandbox } from "@mainsail/test-framework";
import { BigNumber, sleep } from "@mainsail/utils";
import { randomBytes } from "crypto";

export interface TransactionOptions {
	sender: Contracts.Crypto.KeyPair;
	fee?: number | string | BigNumber;
	signature?: string;
	nonceOffset?: number;
	multiSigKeys?: Contracts.Crypto.KeyPair[];
}

export interface TransferOptions extends TransactionOptions {
	recipient?: string;
	amount?: number | string | BigNumber;
}

export interface VoteOptions extends TransactionOptions {
	voteAsset?: string;
	unvoteAsset?: string;
}

export interface ValidatorRegistrationOptions extends TransactionOptions {
	validatorPublicKey?: string;
}

export interface ValidatorResignationOptions extends TransactionOptions {}

export interface UsernameRegistrationOptions extends TransactionOptions {
	username?: string;
}

export interface UsernameResignationOptions extends TransactionOptions {}

export interface MultiPaymentOptions extends TransactionOptions {
	payments: Contracts.Crypto.MultiPaymentItem[];
}

export interface MultiSignatureOptions extends TransactionOptions {
	participants: Contracts.Crypto.KeyPair[];
	participantSignatureOverwrite?: { [index: number]: string };
}

export const makeTransfer = async (
	sandbox: Sandbox,
	options: TransferOptions,
): Promise<Contracts.Crypto.Transaction> => {
	const { app } = sandbox;

	let { sender, recipient, fee, amount } = options;

	recipient =
		recipient ??
		(await app
			.get<Contracts.Crypto.AddressFactory>(Identifiers.Cryptography.Identity.Address.Factory)
			.fromPrivateKey(sender));

	amount = amount ?? "1";
	fee = fee ?? "10000000";

	const builder = app
		.resolve(TransferBuilder)
		.fee(BigNumber.make(fee).toFixed())
		.recipientId(recipient)
		.amount(BigNumber.make(amount).toFixed());

	return buildSignedTransaction(sandbox, builder, sender, options);
};

export const makeVote = async (sandbox: Sandbox, options: VoteOptions): Promise<Contracts.Crypto.Transaction> => {
	const { app } = sandbox;

	let { sender, fee, voteAsset, unvoteAsset } = options;

	fee = fee ?? "100000000";

	let builder = app.resolve(VoteBuilder).fee(BigNumber.make(fee).toFixed());

	if (voteAsset) {
		builder = builder.votesAsset([voteAsset]);
	}

	if (unvoteAsset) {
		builder = builder.unvotesAsset([unvoteAsset]);
	}

	return buildSignedTransaction(sandbox, builder, sender, options);
};

export const makeValidatorRegistration = async (
	sandbox: Sandbox,
	options: ValidatorRegistrationOptions,
): Promise<Contracts.Crypto.Transaction> => {
	const { app } = sandbox;

	let { sender, fee, validatorPublicKey } = options;

	validatorPublicKey = validatorPublicKey ?? (await getRandomConsensusKeyPair(sandbox)).publicKey;
	fee = fee ?? "2500000000";

	const builder = app
		.resolve(ValidatorRegistrationBuilder)
		.publicKeyAsset(validatorPublicKey)
		.fee(BigNumber.make(fee).toFixed());

	return buildSignedTransaction(sandbox, builder, sender, options);
};

export const makeValidatorResignation = async (
	sandbox: Sandbox,
	options: ValidatorResignationOptions,
): Promise<Contracts.Crypto.Transaction> => {
	const { app } = sandbox;

	let { sender, fee } = options;

	fee = fee ?? "2500000000";

	const builder = app.resolve(ValidatorResignationBuilder).fee(BigNumber.make(fee).toFixed());

	return buildSignedTransaction(sandbox, builder, sender, options);
};

export const makeUsernameRegistration = async (
	sandbox: Sandbox,
	options: UsernameRegistrationOptions,
): Promise<Contracts.Crypto.Transaction> => {
	const { app } = sandbox;

	let { sender, fee, username } = options;

	username = username ?? getRandomUsername();
	fee = fee ?? "2500000000";

	const builder = app.resolve(UsernameRegistrationBuilder).usernameAsset(username).fee(BigNumber.make(fee).toFixed());

	return buildSignedTransaction(sandbox, builder, sender, options);
};

export const makeUsernameResignation = async (
	sandbox: Sandbox,
	options: UsernameResignationOptions,
): Promise<Contracts.Crypto.Transaction> => {
	const { app } = sandbox;

	let { sender, fee } = options;

	fee = fee ?? "2500000000";

	const builder = app.resolve(UsernameResignationBuilder).fee(BigNumber.make(fee).toFixed());

	return buildSignedTransaction(sandbox, builder, sender, options);
};

export const makeMultiPayment = async (
	sandbox: Sandbox,
	options: MultiPaymentOptions,
): Promise<Contracts.Crypto.Transaction> => {
	const { app } = sandbox;

	let { sender, fee, payments } = options;

	fee = fee ?? "10000000";

	let builder = app.resolve(MultiPaymentBuilder).fee(BigNumber.make(fee).toFixed());

	for (const payment of payments) {
		builder = builder.addPayment(payment.recipientId, payment.amount.toString());
	}

	return buildSignedTransaction(sandbox, builder, sender, options);
};

export const makeMultiSignatureRegistration = async (
	sandbox: Sandbox,
	options: MultiSignatureOptions,
): Promise<Contracts.Crypto.Transaction> => {
	const { app } = sandbox;

	let { sender, fee, participants, participantSignatureOverwrite } = options;

	fee = fee ?? "500000000";

	let builder = app
		.resolve(MultiSignatureBuilder)
		.senderPublicKey(sender.publicKey)
		.fee(BigNumber.make(fee).toFixed())
		.min(participants.length);

	for (const participant of participants) {
		builder = builder.participant(participant.publicKey);
	}

	for (const [index, participant] of participants.entries()) {
		builder = await builder.multiSignWithKeyPair(participant, index);

		if (participantSignatureOverwrite && participantSignatureOverwrite[index]) {
			builder.data.signatures![index] = participantSignatureOverwrite[index];
		}
	}

	return buildSignedTransaction(sandbox, builder, sender, options);
};

export const getNonceByPublicKey = async (sandbox: Sandbox, publicKey: string): Promise<BigNumber> => {
	const { app } = sandbox;
	const { walletRepository } = app.get<Contracts.State.Service>(Identifiers.State.Service).getStore();
	return (await walletRepository.findByPublicKey(publicKey)).getNonce();
};

export const getAddressByPublicKey = async (sandbox: Sandbox, publicKey: string): Promise<string> => {
	const { app } = sandbox;
	return app
		.get<Contracts.Crypto.AddressFactory>(Identifiers.Cryptography.Identity.Address.Factory)
		.fromPublicKey(publicKey);
};

export const getRandomFundedWallet = async (
	sandbox: Sandbox,
	funder: Contracts.Crypto.KeyPair,
	amount?: BigNumber,
): Promise<Contracts.Crypto.KeyPair> => {
	const { app } = sandbox;

	const seed = Date.now().toString();

	const randomKeyPair = await app
		.getTagged<Contracts.Crypto.KeyPairFactory>(Identifiers.Cryptography.Identity.KeyPair.Factory, "type", "wallet")
		.fromMnemonic(seed);

	const recipient = await app
		.get<Contracts.Crypto.AddressFactory>(Identifiers.Cryptography.Identity.Address.Factory)
		.fromPublicKey(randomKeyPair.publicKey);

	amount = amount ?? BigNumber.make("10000000000");

	const fundTx = await makeTransfer(sandbox, { amount, recipient, sender: funder });

	await addTransactionsToPool(sandbox, [fundTx]);
	await waitBlock(sandbox);

	return randomKeyPair;
};

export const getRandomSignature = async (sandbox: Sandbox): Promise<string> => {
	const { app } = sandbox;

	const signatureSize = app.getTagged<number>(Identifiers.Cryptography.Signature.Size, "type", "wallet");

	return randomBytes(signatureSize).toString("hex");
};

export const buildSignedTransaction = async <TBuilder extends TransactionBuilder<TBuilder>>(
	sandbox: Sandbox,
	builder: TransactionBuilder<TBuilder>,
	keyPair: Contracts.Crypto.KeyPair,
	options: TransactionOptions,
): Promise<Contracts.Crypto.Transaction> => {
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
		const nonce = await getNonceByPublicKey(sandbox, options.sender.publicKey);
		const { nonceOffset = 0 } = options;
		builder = await builder.nonce(nonce.plus(1 + nonceOffset).toString()).signWithKeyPair(keyPair);
	}

	const transaction = await builder.build();

	if (options.signature) {
		await applyCustomSignature(sandbox, transaction, options.signature);
	}

	return transaction;
};

export const getRandomConsensusKeyPair = async (sandbox: Sandbox): Promise<Contracts.Crypto.KeyPair> => {
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

export const getRandomUsername = (): string => `validator_${Date.now().toString()}`.slice(0, 20);
export const getRandomColdWallet = async (
	sandbox: Sandbox,
): Promise<{
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

export const applyCustomSignature = async (
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

export const addTransactionsToPool = async (
	sandbox: Sandbox,
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

export const hasVotedFor = async (
	sandbox: Sandbox,
	voterPublicKey: string,
	votePublicKey: string,
): Promise<boolean> => {
	const { app } = sandbox;

	const { walletRepository } = app.get<Contracts.State.Service>(Identifiers.State.Service).getStore();

	const voterWallet = await walletRepository.findByPublicKey(voterPublicKey);
	return voterWallet.getAttribute("vote") === votePublicKey;
};

export const isValidator = async (sandbox: Sandbox, publicKey: string): Promise<boolean> => {
	const { app } = sandbox;

	const { walletRepository } = app.get<Contracts.State.Service>(Identifiers.State.Service).getStore();

	const wallet = await walletRepository.findByPublicKey(publicKey);
	return wallet.hasAttribute("validatorPublicKey");
};

export const hasUsername = async (sandbox: Sandbox, publicKey: string, username?: string): Promise<boolean> => {
	const { app } = sandbox;

	const { walletRepository } = app.get<Contracts.State.Service>(Identifiers.State.Service).getStore();

	const wallet = await walletRepository.findByPublicKey(publicKey);
	if (username) {
		return wallet.getAttribute("username") === username;
	}

	return wallet.hasAttribute("username");
};

export const hasUnvoted = async (sandbox: Sandbox, voterPublicKey: string): Promise<boolean> => {
	const { app } = sandbox;

	const { walletRepository } = app.get<Contracts.State.Service>(Identifiers.State.Service).getStore();

	const voterWallet = await walletRepository.findByPublicKey(voterPublicKey);
	return !voterWallet.hasAttribute("vote");
};

export const hasResigned = async (sandbox: Sandbox, publicKey: string): Promise<boolean> => {
	const { app } = sandbox;

	const { walletRepository } = app.get<Contracts.State.Service>(Identifiers.State.Service).getStore();

	const wallet = await walletRepository.findByPublicKey(publicKey);
	return wallet.hasAttribute("validatorResigned");
};

export const hasBalance = async (
	sandbox: Sandbox,
	address: string,
	balance: number | string | BigNumber,
): Promise<boolean> => getBalanceByAddress(sandbox, address).isEqualTo(balance);

export const getMultiSignatureWallet = async (
	sandbox: Sandbox,
	participants: Contracts.Crypto.KeyPair[],
): Promise<Contracts.State.Wallet> => {
	const { app } = sandbox;

	const multiSigPublicKey = await app
		.getTagged<Contracts.Crypto.PublicKeyFactory>(
			Identifiers.Cryptography.Identity.PublicKey.Factory,
			"type",
			"wallet",
		)
		.fromMultiSignatureAsset({
			min: participants.length,
			publicKeys: participants.map((p) => p.publicKey),
		});

	const { walletRepository } = app.get<Contracts.State.Service>(Identifiers.State.Service).getStore();
	return walletRepository.findByPublicKey(multiSigPublicKey);
};

export const getBalanceByPublicKey = async (sandbox: Sandbox, publicKey: string): Promise<BigNumber> => {
	const { app } = sandbox;

	const { walletRepository } = app.get<Contracts.State.Service>(Identifiers.State.Service).getStore();

	const wallet = await walletRepository.findByPublicKey(publicKey);
	return wallet.getBalance();
};

export const getBalanceByAddress = (sandbox: Sandbox, address: string): BigNumber => {
	const { app } = sandbox;

	const { walletRepository } = app.get<Contracts.State.Service>(Identifiers.State.Service).getStore();

	const wallet = walletRepository.findByAddress(address);
	return wallet.getBalance();
};

export const isTransactionCommitted = async (
	sandbox: Sandbox,
	{ id }: Contracts.Crypto.Transaction,
): Promise<boolean> => {
	const state = sandbox.app.get<Contracts.State.Service>(Identifiers.State.Service);
	const currentHeight = state.getStore().getLastHeight();

	const database = sandbox.app.get<Contracts.Database.DatabaseService>(Identifiers.Database.Service);
	const forgedBlocks = await database.findBlocks(
		currentHeight - 1,
		currentHeight + 2 /* just a buffer in case tx got included after target height */,
	);

	let found = false;
	for (const block of forgedBlocks) {
		found = block.transactions.some((transaction) => transaction.id === id);
		if (found) {
			break;
		}
	}

	return found;
};

export const getWallets = async (sandbox: Sandbox): Promise<Contracts.Crypto.KeyPair[]> => {
	const walletKeyPairFactory = sandbox.app.getTagged<Contracts.Crypto.KeyPairFactory>(
		Identifiers.Cryptography.Identity.KeyPair.Factory,
		"type",
		"wallet",
	);

	const secrets = sandbox.app.config("validators.secrets");

	const wallets: Contracts.Crypto.KeyPair[] = [];
	for (const secret of secrets.values()) {
		const walletKeyPair = await walletKeyPairFactory.fromMnemonic(secret);
		wallets.push(walletKeyPair);
	}

	return wallets;
};

export const getWalletByAddressOrPublicKey = async (
	sandbox: Sandbox,
	addressOrPublicKey: string,
): Promise<Contracts.State.Wallet> => {
	const { app } = sandbox;

	const { walletRepository } = app.get<Contracts.State.Service>(Identifiers.State.Service).getStore();

	let wallet: Contracts.State.Wallet;
	if (walletRepository.hasByPublicKey(addressOrPublicKey)) {
		wallet = await walletRepository.findByPublicKey(addressOrPublicKey);
	} else {
		wallet = walletRepository.findByAddress(addressOrPublicKey);
	}

	return wallet;
};
