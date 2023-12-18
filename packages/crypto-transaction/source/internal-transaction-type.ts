import { Contracts } from "@mainsail/contracts";

export class InternalTransactionType implements Contracts.Transactions.InternalTransactionType {
	static #types: Map<string, InternalTransactionType> = new Map();

	private constructor(
		public readonly type: number,
		public readonly typeGroup: number,
	) {}

	public static from(type: number, typeGroup?: number): InternalTransactionType {
		if (typeGroup === undefined) {
			typeGroup = Contracts.Crypto.TransactionTypeGroup.Core;
		}

		const compositeType = `${typeGroup}-${type}`;

		if (!this.#types.has(compositeType)) {
			this.#types.set(compositeType, new InternalTransactionType(type, typeGroup));
		}

		return this.#types.get(compositeType)!;
	}

	public toString(): string {
		if (this.typeGroup === Contracts.Crypto.TransactionTypeGroup.Core) {
			return `Core/${this.type}`;
		}

		return `${this.typeGroup}/${this.type}`;
	}
}
