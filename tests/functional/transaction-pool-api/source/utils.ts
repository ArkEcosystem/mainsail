import { Contracts, Identifiers } from "@mainsail/contracts";
import { Sandbox } from "@mainsail/test-framework";
import { Transfers } from "@mainsail/test-transaction-builders";
import { BigNumber, sleep } from "@mainsail/utils";
import { randomBytes } from "crypto";

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
	context: { sandbox: Sandbox; wallets: Contracts.Crypto.KeyPair[] },
	funder: Contracts.Crypto.KeyPair,
	amount?: BigNumber,
): Promise<Contracts.Crypto.KeyPair> => {
	const {
		sandbox: { app },
	} = context;

	const seed = Date.now().toString();

	const randomKeyPair = await app
		.getTagged<Contracts.Crypto.KeyPairFactory>(Identifiers.Cryptography.Identity.KeyPair.Factory, "type", "wallet")
		.fromMnemonic(seed);

	const recipient = await app
		.get<Contracts.Crypto.AddressFactory>(Identifiers.Cryptography.Identity.Address.Factory)
		.fromPublicKey(randomKeyPair.publicKey);

	amount = amount ?? BigNumber.make("10000000000");

	const fundTx = await Transfers.makeTransfer(context, { amount, recipient, sender: funder });

	await addTransactionsToPool(context, [fundTx]);
	await waitBlock(context);

	return randomKeyPair;
};

export const getRandomSignature = async (sandbox: Sandbox): Promise<string> => {
	const { app } = sandbox;

	const signatureSize = app.getTagged<number>(Identifiers.Cryptography.Signature.Size, "type", "wallet");

	return randomBytes(signatureSize).toString("hex");
};

export const getRandomConsensusKeyPair = async ({
	sandbox,
}: {
	sandbox: Sandbox;
}): Promise<Contracts.Crypto.KeyPair> => {
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

export const addTransactionsToPool = async (
	{ sandbox, wallets }: { sandbox: Sandbox; wallets: Contracts.Crypto.KeyPair[] },
	transactions: Contracts.Crypto.Transaction[],
): Promise<Contracts.TransactionPool.ProcessorResult> => {
	const { app } = sandbox;
	const processor = app.get<Contracts.TransactionPool.Processor>(Identifiers.TransactionPool.Processor);
	return processor.process(transactions.map((t) => t.serialized));
};

export const waitBlock = async (
	{ sandbox, wallets }: { sandbox: Sandbox; wallets: Contracts.Crypto.KeyPair[] },
	count: number = 1,
) => {
	const state = sandbox.app.get<Contracts.State.Service>(Identifiers.State.Service);
	const query = sandbox.app.get<Contracts.TransactionPool.Query>(Identifiers.TransactionPool.Query);

	let remainingTransactions = await query.getAll().all();

	let currentHeight = state.getStore().getLastHeight();
	let targetHeight = currentHeight + count;

	do {
		await sleep(100);
		currentHeight = state.getStore().getLastHeight();
		remainingTransactions = await query.getAll().all();

		if (remainingTransactions.length > 0) {
			targetHeight = Math.max(currentHeight, targetHeight) + 1;
		}
	} while (currentHeight < targetHeight);
};

export const hasVotedFor = async (
	{ sandbox }: { sandbox: Sandbox },
	voterPublicKey: string,
	votePublicKey: string,
): Promise<boolean> => {
	const { app } = sandbox;

	const { walletRepository } = app.get<Contracts.State.Service>(Identifiers.State.Service).getStore();

	const voterWallet = await walletRepository.findByPublicKey(voterPublicKey);
	return voterWallet.getAttribute("vote") === votePublicKey;
};

export const isValidator = async ({ sandbox }: { sandbox: Sandbox }, publicKey: string): Promise<boolean> => {
	const { app } = sandbox;

	const { walletRepository } = app.get<Contracts.State.Service>(Identifiers.State.Service).getStore();

	const wallet = await walletRepository.findByPublicKey(publicKey);
	return wallet.hasAttribute("validatorPublicKey");
};

export const hasUsername = async (
	{ sandbox }: { sandbox: Sandbox },
	publicKey: string,
	username?: string,
): Promise<boolean> => {
	const { app } = sandbox;

	const { walletRepository } = app.get<Contracts.State.Service>(Identifiers.State.Service).getStore();

	const wallet = await walletRepository.findByPublicKey(publicKey);
	if (username) {
		return wallet.getAttribute("username") === username;
	}

	return wallet.hasAttribute("username");
};

export const hasUnvoted = async ({ sandbox }: { sandbox: Sandbox }, voterPublicKey: string): Promise<boolean> => {
	const { app } = sandbox;

	const { walletRepository } = app.get<Contracts.State.Service>(Identifiers.State.Service).getStore();

	const voterWallet = await walletRepository.findByPublicKey(voterPublicKey);
	return !voterWallet.hasAttribute("vote");
};

export const hasResigned = async ({ sandbox }: { sandbox: Sandbox }, publicKey: string): Promise<boolean> => {
	const { app } = sandbox;

	const { walletRepository } = app.get<Contracts.State.Service>(Identifiers.State.Service).getStore();

	const wallet = await walletRepository.findByPublicKey(publicKey);
	return wallet.hasAttribute("validatorResigned");
};

export const hasBalance = async (
	{ sandbox }: { sandbox: Sandbox },
	address: string,
	balance: number | string | BigNumber,
): Promise<boolean> => getBalanceByAddress(sandbox, address).isEqualTo(balance);

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
	{ sandbox, wallets }: { sandbox: Sandbox; wallets: Contracts.Crypto.KeyPair[] },
	{ id }: Contracts.Crypto.Transaction,
): Promise<boolean> => {
	const state = sandbox.app.get<Contracts.State.Service>(Identifiers.State.Service);
	const currentHeight = state.getStore().getLastHeight();

	const database = sandbox.app.get<Contracts.Database.DatabaseService>(Identifiers.Database.Service);
	const forgedBlocks = await database.findBlocks(
		currentHeight - 5,
		currentHeight + 5 /* just a buffer in case tx got included after target height */,
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
	{ sandbox }: { sandbox: Sandbox },
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
