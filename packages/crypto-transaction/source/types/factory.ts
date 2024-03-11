import { inject, injectable } from "@mainsail/container";
import { Contracts, Exceptions, Identifiers } from "@mainsail/contracts";

import { InternalTransactionType } from "../internal-transaction-type.js";
import { Transaction } from "./transaction.js";

type TransactionConstructor = typeof Transaction;

@injectable()
export class TransactionTypeFactory implements Contracts.Transactions.TransactionTypeFactory {
	@inject(Identifiers.Application.Instance)
	public readonly app!: Contracts.Kernel.Application;

	#transactionTypes!: Map<Contracts.Transactions.InternalTransactionType, Map<number, TransactionConstructor>>;

	public initialize(
		transactionTypes: Map<Contracts.Transactions.InternalTransactionType, Map<number, TransactionConstructor>>,
	) {
		this.#transactionTypes = transactionTypes;
	}

	public create(data: Contracts.Crypto.TransactionData): Contracts.Crypto.Transaction {
		const instance: Contracts.Crypto.Transaction = this.app.resolve(
			this.get(data.type, data.typeGroup, data.version),
		);
		instance.data = data;
		instance.data.version = data.version || 1;

		return instance;
	}

	public get(type: number, typeGroup?: number, version?: number): Contracts.Crypto.TransactionConstructor {
		const internalType: Contracts.Transactions.InternalTransactionType = InternalTransactionType.from(
			type,
			typeGroup,
		);

		if (!this.#transactionTypes.has(internalType)) {
			throw new Exceptions.UnkownTransactionError(internalType.toString());
		}

		// Either there is a match for the provided version or use the first available constructor as a fallback
		const constructor: Contracts.Crypto.TransactionConstructor = this.#transactionTypes
			.get(internalType)
			?.get(version || 1);

		return constructor ?? [...this.#transactionTypes.get(internalType)!.values()][0];
	}
}
