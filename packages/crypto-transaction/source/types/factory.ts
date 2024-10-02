import { inject, injectable } from "@mainsail/container";
import { Contracts, Exceptions, Identifiers } from "@mainsail/contracts";

import { Transaction } from "./transaction.js";

type TransactionConstructor = typeof Transaction;

@injectable()
export class TransactionTypeFactory implements Contracts.Transactions.TransactionTypeFactory {
	@inject(Identifiers.Application.Instance)
	public readonly app!: Contracts.Kernel.Application;

	#transactionTypes!: Map<number, TransactionConstructor>;

	public initialize(transactionTypes: Map<number, TransactionConstructor>) {
		this.#transactionTypes = transactionTypes;
	}

	public create(data: Contracts.Crypto.TransactionData): Contracts.Crypto.Transaction {
		const instance: Contracts.Crypto.Transaction = this.app.resolve(this.get(data.type, 0, 1));
		instance.data = data;

		return instance;
	}

	public get(type: number, typeGroup?: number, version?: number): Contracts.Crypto.TransactionConstructor {
		if (!this.#transactionTypes.has(type)) {
			throw new Exceptions.UnkownTransactionError(type.toString());
		}

		return this.#transactionTypes.get(type);
	}
}
