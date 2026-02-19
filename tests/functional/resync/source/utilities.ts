import { Identifiers } from "@mainsail/constants";
import type { Contracts } from "@mainsail/contracts";
import { assert, sleep } from "@mainsail/utils";

export const forgeTransactions = async (
    { app }: { app: Contracts.Kernel.Application },
    transactions: Contracts.Crypto.Transaction[],
): Promise<boolean> => {
    const processor = app.get<Contracts.TransactionPool.Processor>(Identifiers.TransactionPool.Processor);
    await processor.process(transactions.map((t) => t.serialized));
    await waitBlock(app);

    for (const tx of transactions) {
        if (!await isTransactionCommitted({ app }, tx)) {
            return false;
        }
    }

    return true;
};

export const waitBlock = async (app: Contracts.Kernel.Application, count: number = 1): Promise<void> => {
    const store = app.get<Contracts.State.Store>(Identifiers.State.Store);
    const query = app.get<Contracts.TransactionPool.Query>(Identifiers.TransactionPool.Query);

    let remainingTransactions = await query.getAll().all();

    let currentBlockNumber = store.getBlockNumber();
    let targetBlockNumber = currentBlockNumber + count;

    do {
        await sleep(100);
        currentBlockNumber = store.getBlockNumber();
        remainingTransactions = await query.getAll().all();

        if (remainingTransactions.length > 0) {
            targetBlockNumber = Math.max(currentBlockNumber, targetBlockNumber) + 1;
        }
    } while (currentBlockNumber < targetBlockNumber);
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