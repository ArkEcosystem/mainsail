import { inject, injectable } from "@arkecosystem/core-container";
import { Contracts, Exceptions, Identifiers } from "@arkecosystem/core-contracts";

import { Transaction } from "./transaction";

type TransactionConstructor = typeof Transaction;

@injectable()
export class TransactionTypeFactory implements Contracts.Transactions.ITransactionTypeFactory {
	@inject(Identifiers.Application)
	public readonly app!: Contracts.Kernel.Application;

	private transactionTypes: Map<Contracts.Transactions.InternalTransactionType, Map<number, TransactionConstructor>>;

	public initialize(
		transactionTypes: Map<Contracts.Transactions.InternalTransactionType, Map<number, TransactionConstructor>>,
	) {
		this.transactionTypes = transactionTypes;
	}

	public create(data: Contracts.Crypto.ITransactionData): Contracts.Crypto.ITransaction {
		const instance: Contracts.Crypto.ITransaction = this.app.resolve(
			this.get(data.type, data.typeGroup, data.version),
		);
		instance.data = data;
		instance.data.version = data.version || 1;

		return instance;
	}

	public get(
		type: number,
		typeGroup?: number,
		version?: number,
	): Contracts.Crypto.TransactionConstructor | undefined {
		const internalType: Contracts.Transactions.InternalTransactionType =
			Contracts.Transactions.InternalTransactionType.from(type, typeGroup);

		if (!this.transactionTypes.has(internalType)) {
			throw new Exceptions.UnkownTransactionError(internalType.toString());
		}

		// Either there is a match for the provided version or use the first available constructor as a fallback
		const constructor: Contracts.Crypto.TransactionConstructor | undefined = this.transactionTypes
			.get(internalType)
			?.get(version || 1);

		return constructor ?? [...this.transactionTypes.get(internalType)!.values()][0];
	}
}
