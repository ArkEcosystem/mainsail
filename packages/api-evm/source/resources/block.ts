import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";

import { TransactionResource } from "./transaction.js";

@injectable()
export class BlockResource {
	@inject(Identifiers.Application.Instance)
	private readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.Cryptography.Configuration)
	private readonly configuration!: Contracts.Crypto.Configuration;

	public async transform(block: Contracts.Crypto.Block, transactionObject: boolean): Promise<object> {
		const blockData: Contracts.Crypto.BlockData = block.data;

		const milestone = this.configuration.getMilestone(blockData.height);

		/* eslint-disable sort-keys-fix/sort-keys-fix */
		return {
			number: `0x${blockData.height.toString(16)}`,
			hash: `0x${blockData.id}`,
			parentHash: `0x${blockData.previousBlock}`,
			nonce: "0x0",
			sha3Uncles: "0x1dcc4de8dec75d7aab85b567b6ccd41ad4e2a311b82e5872087ed76f0f1ccf8f", // No uncles in ARK, this is hash of empty list
			logsBloom: "", // TODO: Implement logs bloom,
			transactionsRoot: `0x${blockData.stateHash}`,
			stateRoot: `0x${blockData.stateHash}`,
			receiptsRoot: `0x${blockData.stateHash}`,
			miner: blockData.generatorAddress,
			difficulty: "0x0",
			totalDifficulty: "0x0",
			extraData: "0x",
			size: `0x${blockData.payloadLength.toString(16)}`, // TODO: Implement block size
			gasLimit: `0x${milestone.block.maxGasLimit.toString(16)}`,
			gasUsed: `0x${blockData.totalGasUsed.toString(16)}`,
			timestamp: `0x${blockData.timestamp.toString(16)}`,
			transactions: transactionObject
				? await this.#transformTransactions(block)
				: block.transactions.map((transaction) => transaction.id),
			uncles: [],
		};
		/* eslint-enable sort-keys-fix/sort-keys-fix */
	}

	async #transformTransactions(block: Contracts.Crypto.Block): Promise<object[]> {
		const transactionResource = this.app.resolve(TransactionResource);
		return Promise.all(
			block.transactions.map(async (transaction) => {
				transaction.data.blockId = block.data.id;
				transaction.data.blockHeight = block.data.height;
				return await transactionResource.transform(transaction.data);
			}),
		);
	}
}
