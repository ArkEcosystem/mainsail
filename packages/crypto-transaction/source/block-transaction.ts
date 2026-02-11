import type { Contracts } from "@mainsail/contracts";

import { Transaction } from "./transaction.js";

export class BlockTransaction extends Transaction {
	public readonly transactionIndex: number;
	// public readonly gasUsed?: number;
	public readonly blockHash: string;
	public readonly blockNumber: number;

	constructor(
		data: Contracts.Crypto.TransactionData,
		serialized: Buffer,
		blockData: { transactionIndex: number; blockNumber: number; blockHash: string },
	) {
		super(data, serialized);

		this.transactionIndex = blockData.transactionIndex;
		this.blockNumber = blockData.blockNumber;
		this.blockHash = blockData.blockHash;
	}
}
