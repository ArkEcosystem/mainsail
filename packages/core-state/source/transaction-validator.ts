import { strictEqual } from "assert";
import { inject, injectable, tagged } from "@arkecosystem/core-container";
import { Contracts, Identifiers } from "@arkecosystem/core-contracts";

@injectable()
export class TransactionValidator implements Contracts.State.TransactionValidator {
	@inject(Identifiers.TransactionHandlerRegistry)
	@tagged("state", "clone")
	private readonly handlerRegistry!: Contracts.Transactions.ITransactionHandlerRegistry;

	@inject(Identifiers.Cryptography.Transaction.Factory)
	private readonly transactionFactory: Contracts.Crypto.ITransactionFactory;

	public async validate(transaction: Contracts.Crypto.ITransaction): Promise<void> {
		const deserialized: Contracts.Crypto.ITransaction = await this.transactionFactory.fromBytes(
			transaction.serialized,
		);
		strictEqual(transaction.id, deserialized.id);
		const handler = await this.handlerRegistry.getActivatedHandlerForData(transaction.data);
		await handler.apply(transaction);
	}
}
