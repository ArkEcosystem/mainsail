import { strictEqual } from "assert";
import Contracts, { Crypto, Identifiers } from "@arkecosystem/core-contracts";
import { Container } from "@arkecosystem/core-kernel";

@Container.injectable()
export class TransactionValidator implements Contracts.State.TransactionValidator {
	@Container.inject(Identifiers.TransactionHandlerRegistry)
	@Container.tagged("state", "clone")
	private readonly handlerRegistry!: Contracts.Transactions.ITransactionHandlerRegistry;

	@Container.inject(Identifiers.Cryptography.Transaction.Factory)
	private readonly transactionFactory: Crypto.ITransactionFactory;

	public async validate(transaction: Crypto.ITransaction): Promise<void> {
		const deserialized: Crypto.ITransaction = await this.transactionFactory.fromBytes(transaction.serialized);
		strictEqual(transaction.id, deserialized.id);
		const handler = await this.handlerRegistry.getActivatedHandlerForData(transaction.data);
		await handler.apply(transaction);
	}
}
