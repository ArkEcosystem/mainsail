import type { Contracts } from "@mainsail/contracts";

import { BlockTransaction } from "@mainsail/crypto-transaction";

interface BlockArguments {
	data: Contracts.Crypto.BlockHeader;
	serialized: string;
	transactions: Contracts.Crypto.Transaction[];
}

export class Block implements Contracts.Crypto.Block {
	public readonly timestamp: number;
	public readonly version: number;
	public readonly number: number;
	public readonly round: number;
	public readonly parentHash: string;
	public readonly stateRoot: string;
	public readonly logsBloom: string;
	public readonly transactionsCount: number;
	public readonly gasUsed: number;
	public readonly fee: bigint;
	public readonly reward: bigint;
	public readonly payloadSize: number;
	public readonly transactionsRoot: string;
	public readonly proposer: string;
	public readonly randaoReveal: string;
	public readonly hash: string;
	public readonly serialized: string;
	public readonly transactions: Contracts.Crypto.BlockTransaction[];

	public constructor({ data, serialized, transactions }: BlockArguments) {
		this.timestamp = data.timestamp;
		this.version = data.version;
		this.number = data.number;
		this.round = data.round;
		this.parentHash = data.parentHash;
		this.stateRoot = data.stateRoot;
		this.logsBloom = data.logsBloom;
		this.transactionsCount = data.transactionsCount;
		this.gasUsed = data.gasUsed;
		this.fee = data.fee;
		this.reward = data.reward;
		this.payloadSize = data.payloadSize;
		this.transactionsRoot = data.transactionsRoot;
		this.proposer = data.proposer;
		this.randaoReveal = data.randaoReveal;

		this.hash = data.hash;
		this.serialized = serialized;

		this.transactions = transactions.map(
			(transaction, index) =>
				new BlockTransaction(transaction, transaction.serialized, {
					blockHash: this.hash,
					blockNumber: this.number,
					transactionIndex: index,
				}),
		);
	}

	toData(): Contracts.Crypto.BlockData {
		return {
			/* eslint-disable perfectionist/sort-objects */
			timestamp: this.timestamp,
			version: this.version,
			number: this.number,
			round: this.round,
			parentHash: this.parentHash,
			stateRoot: this.stateRoot,
			logsBloom: this.logsBloom,
			transactionsCount: this.transactionsCount,
			gasUsed: this.gasUsed,
			fee: this.fee,
			reward: this.reward,
			payloadSize: this.payloadSize,
			transactionsRoot: this.transactionsRoot,
			proposer: this.proposer,
			randaoReveal: this.randaoReveal,
			hash: this.hash,
			transactions: this.transactions.map((transaction) => transaction.toData()),
			/* eslint-enable perfectionist/sort-objects */
		};
	}
}
