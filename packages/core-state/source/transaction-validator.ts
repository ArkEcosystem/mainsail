import { strictEqual } from "assert";
import Contracts, { Crypto, Identifiers } from "@arkecosystem/core-contracts";
import { inject, injectable, tagged } from "@arkecosystem/core-container";

@injectable()
export class TransactionValidator implements Contracts.State.TransactionValidator {
	@inject(Identifiers.TransactionHandlerRegistry)
	@tagged("state", "clone")
	private readonly handlerRegistry!: Contracts.Transactions.ITransactionHandlerRegistry;

	@inject(Identifiers.Cryptography.Transaction.Factory)
	private readonly transactionFactory: Crypto.ITransactionFactory;

	public async validate(transaction: Crypto.ITransaction): Promise<void> {
		const deserialized: Crypto.ITransaction = await this.transactionFactory.fromBytes(transaction.serialized);
		strictEqual(transaction.id, deserialized.id);
		const handler = await this.handlerRegistry.getActivatedHandlerForData(transaction.data);
		await handler.apply(transaction);
	}
}
