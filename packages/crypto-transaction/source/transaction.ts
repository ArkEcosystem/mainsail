import { injectable } from "@mainsail/container";
import type { Contracts } from "@mainsail/contracts";

@injectable()
export class Transaction implements Contracts.Crypto.Transaction {
	public data: Contracts.Crypto.TransactionData;
	public serialized: Buffer;

	constructor(data: Contracts.Crypto.TransactionData, serialized: Buffer) {
		this.data = data;
		this.serialized = serialized;
	}

	public get hash(): string {
		return this.data.hash;
	}
}
