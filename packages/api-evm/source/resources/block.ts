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

		const milestone = this.configuration.getMilestone(blockData.number);

		/* eslint-disable sort-keys-fix/sort-keys-fix */
		return {
			number: `0x${blockData.number.toString(16)}`,
			hash: `0x${blockData.hash}`,
			parentHash: `0x${blockData.parentHash}`,
			nonce: "0x0000000000000000",
			sha3Uncles: "0x1dcc4de8dec75d7aab85b567b6ccd41ad4e2a311b82e5872087ed76f0f1ccf8f", // No uncles in ARK, this is hash of empty list
			logsBloom: `0x${blockData.logsBloom}`,
			transactionsRoot: `0x${blockData.stateRoot}`,
			stateRoot: `0x${blockData.stateRoot}`,
			receiptsRoot: `0x${blockData.stateRoot}`,
			miner: blockData.proposer.toLowerCase(),
			difficulty: "0x0",
			totalDifficulty: "0x0",
			baseFeePerGas: "0x0",
			extraData: "0x",
			size: `0x${blockData.payloadSize.toString(16)}`, // TODO: Add block header size
			gasLimit: `0x${milestone.block.maxGasLimit.toString(16)}`,
			gasUsed: `0x${blockData.gasUsed.toString(16)}`,
			timestamp: `0x${blockData.timestamp.toString(16)}`,
			transactions: transactionObject
				? await this.#transformTransactions(block)
				: block.transactions.map((transaction) => transaction.hash),
			uncles: [],
		};
		/* eslint-enable sort-keys-fix/sort-keys-fix */
	}

	async #transformTransactions(block: Contracts.Crypto.Block): Promise<object[]> {
		const transactionResource = this.app.resolve(TransactionResource);
		return Promise.all(
			block.transactions.map(async (transaction) => {
				transaction.data.blockHash = block.data.hash;
				transaction.data.blockNumber = block.data.number;
				return await transactionResource.transform(transaction.data);
			}),
		);
	}
}
