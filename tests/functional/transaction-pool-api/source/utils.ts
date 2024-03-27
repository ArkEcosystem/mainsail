import { Contracts, Identifiers } from "@mainsail/contracts";
import { TransferBuilder } from "@mainsail/crypto-transaction-transfer";
import { Sandbox } from "@mainsail/test-framework";
import { BigNumber, sleep } from "@mainsail/utils";

export interface TransferOptions {
	sender: Contracts.Crypto.KeyPair;
	recipient?: string;
	amount?: number | string | BigNumber;
	fee?: number | string | BigNumber;
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

	const { walletRepository } = app.get<Contracts.State.Service>(Identifiers.State.Service).getStore();
	const nonce = (await walletRepository.findByPublicKey(sender.publicKey)).getNonce();

	amount = amount ?? "1";
	fee = fee ?? "10000000";

	const signed = await app
		.resolve(TransferBuilder)
		.fee(BigNumber.make(fee).toFixed())
		.nonce(nonce.plus(1).toFixed())
		.recipientId(recipient)
		.amount(BigNumber.make(amount).toFixed())
		.signWithKeyPair(sender);

	return signed.build();
};

export const makeAndAddransfer = async (
	sandbox: Sandbox,
	options: TransferOptions,
): Promise<Contracts.TransactionPool.ProcessorResult> => {
	const tx = await makeTransfer(sandbox, options);

	const { app } = sandbox;
	const processor = app.get<Contracts.TransactionPool.Processor>(Identifiers.TransactionPool.Processor);

	return processor.process([tx.serialized]);
};
export const addTransactionsToPool = async (
	sandbox: Sandbox,
	transactions: Contracts.Crypto.Transaction[],
): Promise<Contracts.TransactionPool.ProcessorResult> => {
	const { app } = sandbox;
	const processor = app.get<Contracts.TransactionPool.Processor>(Identifiers.TransactionPool.Processor);
	return processor.process(transactions.map((t) => t.serialized));
};

export const waitUntilBlock = async (sandbox: Sandbox, targetHeight: number) => {
	const state = sandbox.app.get<Contracts.State.Service>(Identifiers.State.Service);
	let currentHeight = state.getStore().getLastHeight();

	do {
		await sleep(200);
		currentHeight = state.getStore().getLastHeight();
	} while (targetHeight < currentHeight);
};

export const assertTransactionCommitted = async (
	sandbox: Sandbox,
	targetHeight: number,
	{ id }: Contracts.Crypto.Transaction,
): Promise<boolean> => {
	const database = sandbox.app.get<Contracts.Database.DatabaseService>(Identifiers.Database.Service);
	const forgedBlocks = await database.findBlocks(
		targetHeight,
		targetHeight + 2 /* just a buffer in case tx got included after target height */,
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
