import Interfaces, { BINDINGS, ITransactionFactory } from "@arkecosystem/core-crypto-contracts";
import { Container, Contracts } from "@arkecosystem/core-kernel";
import { strictEqual } from "assert";

@Container.injectable()
export class TransactionValidator implements Contracts.State.TransactionValidator {
	@Container.inject(Container.Identifiers.TransactionHandlerRegistry)
	@Container.tagged("state", "clone")
	private readonly handlerRegistry!: Contracts.Transactions.ITransactionHandlerRegistry;

	@Container.inject(BINDINGS.Transaction.Factory)
	private readonly transactionFactory: ITransactionFactory;

	public async validate(transaction: Interfaces.ITransaction): Promise<void> {
		const deserialized: Interfaces.ITransaction = await this.transactionFactory.fromBytes(transaction.serialized);
		strictEqual(transaction.id, deserialized.id);
		const handler = await this.handlerRegistry.getActivatedHandlerForData(transaction.data);
		await handler.apply(transaction);
	}
}
