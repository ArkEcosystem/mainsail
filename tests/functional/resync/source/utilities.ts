import type { Contracts } from "@mainsail/contracts";

import { Identifiers } from "@mainsail/constants";
import { Utils } from "@mainsail/test-transaction-builders";
import { assert, sleep } from "@mainsail/utils";

import { runDatabaseQuery } from "./setup.js";

export const forgeTransactions = async (
	{ app }: { app: Contracts.Kernel.Application },
	transactions: Contracts.Crypto.Transaction[],
): Promise<boolean> => {
	const processor = app.get<Contracts.TransactionPool.Processor>(Identifiers.TransactionPool.Processor);
	await processor.process(transactions.map((t) => t.serialized));
	await Utils.waitBlock({ app });

	for (const tx of transactions) {
		if (!(await isTransactionCommitted({ app }, tx))) {
			return false;
		}
	}

	return true;
};

export const isTransactionCommitted = async (
	{ app }: { app: Contracts.Kernel.Application },
	{ hash }: Contracts.Crypto.Transaction,
): Promise<boolean> => {
	const evm = app.getTagged<Contracts.Evm.Instance>(Identifiers.Evm.Instance, "instance", "evm");
	const database = app.get<Contracts.Database.DatabaseService>(Identifiers.Database.Service);
	const transaction = await database.getTransactionByHash(hash);
	if (!transaction) {
		return false;
	}

	const result = await evm.getReceipt(BigInt(transaction.blockNumber), hash);
	if (!result.receipt || result.receipt.status !== 1) {
		console.log("unexpected result", result);
		console.log(result.receipt?.output?.toString("hex"));
		return false;
	}

	return true;
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

export const waitForApiSync = async (app: Contracts.Kernel.Application): Promise<void> => {
	const blockNumber = app.get<Contracts.State.Store>(Identifiers.State.Store).getBlockNumber();
	const apiSync = app.get<Contracts.ApiSync.Service>(Identifiers.ApiSync.Service);
	const deadline = Date.now() + 30_000;
	while ((await apiSync.getLastSyncedBlockHeight()) < blockNumber) {
		if (Date.now() > deadline) {
			throw new Error(`api sync did not reach block ${blockNumber}`);
		}

		await sleep(50);
	}
};

export const getApiRow = async (
	app: Contracts.Kernel.Application,
	table: "wallets" | "legacy_cold_wallets",
	address: string,
): Promise<Record<string, any> | undefined> => {
	await waitForApiSync(app);

	const [row] = await runDatabaseQuery(app.get<string>(Identifiers.Application.Name), async (dataSource) =>
		dataSource.query(`SELECT * FROM ${table} WHERE address = $1`, [address]),
	);

	return row;
};
