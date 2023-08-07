import { inject, injectable, tagged } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { strictEqual } from "assert";

@injectable()
export class TransactionValidator implements Contracts.State.TransactionValidator {
	@inject(Identifiers.TransactionHandlerRegistry)
	private readonly handlerRegistry!: Contracts.Transactions.ITransactionHandlerRegistry;

	@inject(Identifiers.WalletRepository)
	@tagged("state", "clone")
	private walletRepository!: Contracts.State.WalletRepository;

	@inject(Identifiers.Cryptography.Transaction.Factory)
	private readonly transactionFactory!: Contracts.Crypto.ITransactionFactory;

	public async validate(transaction: Contracts.Crypto.ITransaction): Promise<void> {
		const deserialized: Contracts.Crypto.ITransaction = await this.transactionFactory.fromBytes(
			transaction.serialized,
		);
		strictEqual(transaction.id, deserialized.id);
		const handler = await this.handlerRegistry.getActivatedHandlerForData(transaction.data);
		await handler.apply(this.walletRepository, transaction);
	}
}
