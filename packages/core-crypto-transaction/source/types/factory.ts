import { inject, injectable } from "@arkecosystem/core-container";
import Contracts, { Crypto, Identifiers } from "@arkecosystem/core-contracts";

import { UnkownTransactionError } from "@arkecosystem/core-contracts";
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

	public create(data: Crypto.ITransactionData): Crypto.ITransaction {
		const instance: Crypto.ITransaction = this.app.resolve(this.get(data.type, data.typeGroup, data.version));
		instance.data = data;
		instance.data.version = data.version || 1;

		return instance;
	}

	public get(type: number, typeGroup?: number, version?: number): Crypto.TransactionConstructor | undefined {
		const internalType: Contracts.Transactions.InternalTransactionType =
			Contracts.Transactions.InternalTransactionType.from(type, typeGroup);

		if (!this.transactionTypes.has(internalType)) {
			throw new UnkownTransactionError(internalType.toString());
		}

		// Either there is a match for the provided version or use the first available constructor as a fallback
		const constructor: Crypto.TransactionConstructor | undefined = this.transactionTypes
			.get(internalType)
			?.get(version || 1);

		return constructor ?? [...this.transactionTypes.get(internalType)!.values()][0];
	}
}
