import type { Contracts } from "@mainsail/contracts";

import { Identifiers } from "@mainsail/constants";
import { inject, injectable } from "@mainsail/container";
import { assert } from "@mainsail/utils";

import { TransactionForger } from "./transaction-forger.js";

@injectable()
export class BlockForger implements Contracts.Forger.BlockForger {
	@inject(Identifiers.Application.Instance)
	private readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.Cryptography.Configuration)
	private readonly cryptoConfiguration!: Contracts.Crypto.Configuration;

	@inject(Identifiers.State.Store)
	protected readonly stateStore!: Contracts.State.Store;

	@inject(Identifiers.Cryptography.Block.Factory)
	private readonly blockFactory!: Contracts.Crypto.BlockFactory;

	@inject(Identifiers.Cryptography.Hash.Factory)
	private readonly hashFactory!: Contracts.Crypto.HashFactory;

	public async forgeBlock(
		generatorAddress: string,
		round: number,
		timestamp: number,
		randaoReveal: string,
	): Promise<Contracts.Crypto.Block> {
		const previousBlock = this.stateStore.getLastBlock();
		const blockNumber = previousBlock.number + 1;

		const transactionForger = this.app.resolve(TransactionForger).initialize(
			generatorAddress,
			timestamp,
			{
				blockNumber: BigInt(blockNumber),
				round: BigInt(round),
			},
			randaoReveal,
		);

		const { fee, gasUsed, logsBloom, stateRoot, transactions } = await transactionForger.getTransactions();
		return this.#makeBlock(
			round,
			generatorAddress,
			logsBloom,
			stateRoot,
			transactions,
			timestamp,
			gasUsed,
			fee,
			randaoReveal,
		);
	}

	async #makeBlock(
		round: number,
		proposer: string,
		logsBloom: string,
		stateRoot: string,
		transactions: Contracts.Crypto.Transaction[],
		timestamp: number,
		gasUsed: number,
		fee: bigint,
		randaoReveal: string,
	): Promise<Contracts.Crypto.Block> {
		const previousBlock = this.stateStore.getLastBlock();
		const number = previousBlock.number + 1;
		const milestone = this.cryptoConfiguration.getMilestone(number);

		const payloadBuffers: Buffer[] = [];
		const transactionData: Contracts.Crypto.TransactionData[] = [];

		// The payload length needs to account for the overhead of each serialized transaction
		// which is a uint32 per transaction to store the individual length.
		let payloadSize = transactions.length * 4;

		for (const transaction of transactions) {
			assert.string(transaction.hash);

			payloadBuffers.push(Buffer.from(transaction.hash, "hex"));
			transactionData.push(transaction.toData());
			payloadSize += transaction.serialized.length;
		}

		return this.blockFactory.make(
			{
				fee,
				gasUsed,
				logsBloom,
				number,
				parentHash: previousBlock.hash,
				payloadSize,
				proposer,
				randaoReveal,
				reward: BigInt(milestone.reward),
				round,
				stateRoot,
				timestamp,
				transactionsCount: transactionData.length,
				transactionsRoot: this.hashFactory.sha256(payloadBuffers).toString("hex"),
				version: 1,
			},
			transactions,
		);
	}
}
