import type { Contracts } from "@mainsail/contracts";

import { Identifiers } from "@mainsail/constants";
import { inject, injectable } from "@mainsail/container";

import { TransactionResource } from "./transaction.js";

@injectable()
export class BlockResource {
	@inject(Identifiers.Application.Instance)
	private readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.Cryptography.Configuration)
	private readonly configuration!: Contracts.Crypto.Configuration;

	public async transform(block: Contracts.Crypto.Block, transactionObject: boolean): Promise<object> {
		const milestone = this.configuration.getMilestone(block.number);

		/* eslint-disable perfectionist/sort-objects */
		return {
			number: `0x${block.number.toString(16)}`,
			hash: `0x${block.hash}`,
			parentHash: `0x${block.parentHash}`,
			nonce: "0x0000000000000000",
			sha3Uncles: "0x1dcc4de8dec75d7aab85b567b6ccd41ad4e2a311b82e5872087ed76f0f1ccf8f", // No uncles in ARK, this is hash of empty list
			logsBloom: `0x${block.logsBloom}`,
			transactionsRoot: `0x${block.transactionsRoot}`,
			stateRoot: `0x${block.stateRoot}`,
			receiptsRoot: `0x${block.stateRoot}`,
			miner: block.proposer.toLowerCase(),
			difficulty: "0x0",
			totalDifficulty: "0x0",
			// baseFeePerGas: "0x0",
			extraData: "0x",
			size: `0x${block.payloadSize.toString(16)}`, // TODO: Add block header size
			gasLimit: `0x${milestone.block.maxGasLimit.toString(16)}`,
			gasUsed: `0x${block.gasUsed.toString(16)}`,
			timestamp: `0x${block.timestamp.toString(16)}`,
			transactions: transactionObject
				? await this.#transformTransactions(block)
				: block.transactions.map((transaction) => transaction.hash),
			uncles: [],
		};
		/* eslint-enable perfectionist/sort-objects */
	}

	async #transformTransactions(block: Contracts.Crypto.Block): Promise<object[]> {
		const transactionResource = this.app.resolve(TransactionResource);
		return Promise.all(
			block.transactions.map(
				async (transaction) =>
					await transactionResource.transform({
						...transaction,
						blockHash: block.hash,
						blockNumber: block.number,
					}),
			),
		);
	}
}
