import { inject, injectable, postConstruct } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { strictEqual } from "assert";

@injectable()
export class TransactionValidator implements Contracts.State.TransactionValidator {
	@inject(Identifiers.TransactionHandlerRegistry)
	private readonly handlerRegistry!: Contracts.Transactions.ITransactionHandlerRegistry;

	@inject(Identifiers.StateService)
	private readonly stateService!: Contracts.State.Service;

	@inject(Identifiers.Cryptography.Transaction.Factory)
	private readonly transactionFactory!: Contracts.Crypto.ITransactionFactory;

	#walletRepository!: Contracts.State.WalletRepositoryClone;

	@postConstruct()
	public initialize(): void {
		this.#walletRepository = this.stateService.createWalletRepositoryClone();
	}

	public async validate(transaction: Contracts.Crypto.ITransaction): Promise<void> {
		const deserialized: Contracts.Crypto.ITransaction = await this.transactionFactory.fromBytes(
			transaction.serialized,
		);
		strictEqual(transaction.id, deserialized.id);
		const handler = await this.handlerRegistry.getActivatedHandlerForData(transaction.data);
		await handler.apply(this.#walletRepository, transaction);
	}
}
