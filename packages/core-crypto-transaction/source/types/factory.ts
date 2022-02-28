import { ITransaction, ITransactionData } from "@arkecosystem/core-crypto-contracts";
import { Contracts } from "@arkecosystem/core-kernel";

import { UnkownTransactionError } from "../errors";
import { Transaction } from "./transaction";

type TransactionConstructor = typeof Transaction;

export class TransactionTypeFactory {
	private static transactionTypes: Map<
		Contracts.Transactions.InternalTransactionType,
		Map<number, TransactionConstructor>
	>;

	public static initialize(
		transactionTypes: Map<Contracts.Transactions.InternalTransactionType, Map<number, TransactionConstructor>>,
	) {
		this.transactionTypes = transactionTypes;
	}

	public static create(data: ITransactionData): ITransaction {
		const instance: ITransaction = new (this.get(data.type, data.typeGroup, data.version) as any)() as ITransaction;
		instance.data = data;
		instance.data.version = data.version || 1;

		return instance;
	}

	public static get(type: number, typeGroup?: number, version?: number): TransactionConstructor | undefined {
		const internalType: Contracts.Transactions.InternalTransactionType =
			Contracts.Transactions.InternalTransactionType.from(type, typeGroup);

		if (!this.transactionTypes.has(internalType)) {
			throw new UnkownTransactionError(internalType.toString());
		}

		// Either there is a match for the provided version or use the first available constructor as a fallback
		const constructor: TransactionConstructor | undefined = this.transactionTypes
			.get(internalType)
			?.get(version || 1);
		return constructor ?? [...this.transactionTypes.get(internalType)!.values()][0];
	}
}
