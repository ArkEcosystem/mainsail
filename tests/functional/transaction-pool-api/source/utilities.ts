import type { Contracts } from "@mainsail/contracts";

import { Identifiers } from "@mainsail/constants";
import { EvmCalls, Utils } from "@mainsail/test-transaction-builders";
import { assert } from "@mainsail/utils";
import { randomBytes } from "crypto";

export const getAddressByPublicKey = async (app: Contracts.Kernel.Application, publicKey: string): Promise<string> => {
	return app
		.get<Contracts.Crypto.AddressFactory>(Identifiers.Cryptography.Identity.Address.Factory)
		.fromPublicKey(publicKey);
};

export const getRandomFundedWallet = async (
	context: { app: Contracts.Kernel.Application; wallets: Contracts.Crypto.KeyPair[] },
	funder: Contracts.Crypto.KeyPair,
	amount?: bigint,
): Promise<Contracts.Crypto.KeyPair> => {
	const { app } = context;

	const seed = Date.now().toString();

	const randomKeyPair = await app
		.getTagged<Contracts.Crypto.KeyPairFactory>(Identifiers.Cryptography.Identity.KeyPair.Factory, "type", "wallet")
		.fromMnemonic(seed);

	const recipient = await app
		.get<Contracts.Crypto.AddressFactory>(Identifiers.Cryptography.Identity.Address.Factory)
		.fromPublicKey(randomKeyPair.publicKey);

	amount = amount ?? 1000000000000000000n;

	const fundTx = await EvmCalls.makeEvmCall(context, { recipient, sender: funder, value: amount });

	await addTransactionsToPool(context, [fundTx]);
	await Utils.waitBlock(context);

	return randomKeyPair;
};

export const getRandomSignature = async (app: Contracts.Kernel.Application): Promise<string> => {
	const signatureSize = app.getTagged<number>(Identifiers.Cryptography.Signature.Size, "type", "wallet");

	return randomBytes(signatureSize).toString("hex");
};

export const getRandomConsensusKeyPair = async ({
	app,
}: {
	app: Contracts.Kernel.Application;
}): Promise<Contracts.Crypto.KeyPair> => {
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
	app: Contracts.Kernel.Application,
): Promise<{
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

export const addTransactionsToPool = async (
	{ app, wallets }: { app: Contracts.Kernel.Application; wallets: Contracts.Crypto.KeyPair[] },
	transactions: Contracts.Crypto.Transaction[],
): Promise<Contracts.TransactionPool.ProcessorResult> => {
	const processor = app.get<Contracts.TransactionPool.Processor>(Identifiers.TransactionPool.Processor);
	return processor.process(transactions.map((t) => t.serialized));
};

export const hasBalance = async (
	{ app }: { app: Contracts.Kernel.Application },
	address: string,
	balance: number | string | bigint,
): Promise<boolean> => (await getBalanceByAddress(app, address)) === BigInt(balance);

export const publicKeyToAddress = async (app: Contracts.Kernel.Application, publicKey: string): Promise<string> =>
	app
		.get<Contracts.Crypto.AddressFactory>(Identifiers.Cryptography.Identity.Address.Factory)
		.fromPublicKey(publicKey);

export const getBalanceByPublicKey = async (app: Contracts.Kernel.Application, publicKey: string): Promise<bigint> => {
	const address = await publicKeyToAddress(app, publicKey);
	return getBalanceByAddress(app, address);
};

export const getBalanceByAddress = async (app: Contracts.Kernel.Application, address: string): Promise<bigint> => {
	const instance = app.getTagged<Contracts.Evm.Instance>(Identifiers.Evm.Instance, "instance", "evm");
	const accountInfo = await instance.getAccountInfo(address);

	return accountInfo.balance;
};

export const isTransactionCommitted = async (
	{ app, wallets }: { app: Contracts.Kernel.Application; wallets: Contracts.Crypto.KeyPair[] },
	{ hash }: Contracts.Crypto.Transaction,
): Promise<boolean> => {
	const database = app.get<Contracts.Database.DatabaseService>(Identifiers.Database.Service);
	return (await database.getTransactionByHash(hash)) !== undefined;
};

export const getTransactionReceipt = async (
	{ app }: { app: Contracts.Kernel.Application },
	{ hash }: Contracts.Crypto.Transaction,
): Promise<Contracts.Evm.TransactionReceipt | undefined> => {
	const store = app.get<Contracts.State.Store>(Identifiers.State.Store);
	const currentBlockNumber = store.getBlockNumber();

	const database = app.get<Contracts.Database.DatabaseService>(Identifiers.Database.Service);
	const forgedBlocks = await database.findBlocks(0, currentBlockNumber);

	for (const block of forgedBlocks) {
		if (!block.transactions.some((transaction) => transaction.hash === hash)) {
			continue;
		}

		const evm = app.getTagged<Contracts.Evm.Instance>(Identifiers.Evm.Instance, "instance", "evm");
		const { receipt } = await evm.getReceipt(BigInt(block.number), hash);
		return receipt;
	}

	return undefined;
};

export const getWallets = async (app: Contracts.Kernel.Application): Promise<Contracts.Crypto.KeyPair[]> => {
	const walletKeyPairFactory = app.getTagged<Contracts.Crypto.KeyPairFactory>(
		Identifiers.Cryptography.Identity.KeyPair.Factory,
		"type",
		"wallet",
	);

	const secrets = app.config<string[]>("validators.secrets");
	assert.defined(secrets);

	const wallets: Contracts.Crypto.KeyPair[] = [];
	for (const secret of secrets.values()) {
		const walletKeyPair = await walletKeyPairFactory.fromMnemonic(secret);
		wallets.push(walletKeyPair);
	}

	return wallets;
};

export const getLegacyColdWallets = async (
	app: Contracts.Kernel.Application,
): Promise<
	{ keyPair: Contracts.Crypto.KeyPair; mainsailAddress: string; legacyColdWallet: Contracts.Evm.LegacyColdWallet }[]
> => {
	const walletKeyPairFactory = app.getTagged<Contracts.Crypto.KeyPairFactory>(
		Identifiers.Cryptography.Identity.KeyPair.Factory,
		"type",
		"wallet",
	);

	const mainsailAddressFactory = app.get<Contracts.Crypto.AddressFactory>(
		Identifiers.Cryptography.Identity.Address.Factory,
	);

	const legacyAddressFactory = app.get<Contracts.Crypto.AddressFactory>(
		Identifiers.Cryptography.Legacy.Identity.AddressFactory,
	);

	const secrets = app.config<string[]>("validators.secrets");
	assert.defined(secrets);

	const legacyColdWallets: {
		keyPair: Contracts.Crypto.KeyPair;
		mainsailAddress: string;
		legacyColdWallet: Contracts.Evm.LegacyColdWallet;
	}[] = [];
	for (const secret of secrets.values()) {
		// use reversed secret as seed to not conflict with validators
		const reversed = secret.split(" ").reverse().join(" ");

		const walletKeyPair = await walletKeyPairFactory.fromMnemonic(reversed);

		const mainsailAddress = await mainsailAddressFactory.fromPublicKey(walletKeyPair.publicKey);
		const legacyAddress = await legacyAddressFactory.fromPublicKey(walletKeyPair.publicKey);
		legacyColdWallets.push({
			keyPair: walletKeyPair,
			legacyColdWallet: {
				address: legacyAddress,
				balance: 1_000_000_000_000_000_000n,
				legacyAttributes: {},
			},
			mainsailAddress,
		});
	}

	return legacyColdWallets;
};

export const getAccountByAddressOrPublicKey = async (
	{ app }: { app: Contracts.Kernel.Application },
	addressOrPublicKey: string,
): Promise<Contracts.Evm.AccountInfoExtended> => {
	const evm = app.getTagged<Contracts.Evm.Instance>(Identifiers.Evm.Instance, "instance", "evm");

	try {
		return evm.getAccountInfoExtended(addressOrPublicKey);
	} catch {
		return evm.getAccountInfoExtended(await publicKeyToAddress(app, addressOrPublicKey));
	}
};
