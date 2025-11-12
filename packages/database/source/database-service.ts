import { Identifiers } from "@mainsail/constants";
import { inject, injectable, tagged } from "@mainsail/container";
import type { Contracts } from "@mainsail/contracts";
import { assert } from "@mainsail/utils";

@injectable()
export class DatabaseService implements Contracts.Database.DatabaseService {
	@inject(Identifiers.Evm.Instance)
	@tagged("instance", "evm")
	private readonly storage!: Contracts.Evm.Storage;

	@inject(Identifiers.Cryptography.Commit.Factory)
	private readonly commitFactory!: Contracts.Crypto.CommitFactory;

	@inject(Identifiers.Cryptography.Commit.Serializer)
	private readonly commitSerializer!: Contracts.Crypto.CommitSerializer;

	@inject(Identifiers.Cryptography.Block.Factory)
	private readonly blockFactory!: Contracts.Crypto.BlockFactory;

	@inject(Identifiers.Cryptography.Transaction.Factory)
	private readonly transactionFactory!: Contracts.Crypto.TransactionFactory;

	#state = { blockNumber: 0, totalRound: 0 };

	public async initialize(): Promise<void> {
		this.#state = await this.storage.getState();
	}

	public getState(): Contracts.Database.State {
		return this.#state;
	}

	public async isEmpty(): Promise<boolean> {
		return this.storage.isEmpty();
	}

	public async hasCommitByHash(blockHash: string): Promise<boolean> {
		const blockNumber = await this.#getBlockNumberByHash(blockHash);
		return blockNumber !== undefined;
	}

	public async findCommitBuffers(start: number, end: number): Promise<Buffer[]> {
		const blockNumbers: number[] = [];

		for (const blockNumber of this.#range(start, end)) {
			blockNumbers.push(blockNumber);
		}

		const buffers = await Promise.all(
			blockNumbers.map(async (blockNumber: number) => {
				try {
					const commitStorage = await this.#readCommitStorage(blockNumber);
					if (!commitStorage) {
						return;
					}

					return this.commitSerializer.serializeCommit(await this.commitFactory.fromStorage(commitStorage));
				} catch {
					return;
				}
			}),
		);

		return buffers.filter((commit) => !!commit);
	}

	public async getBlock(blockNumber: number): Promise<Contracts.Crypto.Block | undefined> {
		const commit = await this.#readCommitStorage(blockNumber);
		if (commit) {
			const { block } = await this.commitFactory.fromStorage(commit);
			return block;
		}

		return undefined;
	}

	public async getBlockByHash(blockHash: string): Promise<Contracts.Crypto.Block | undefined> {
		const blockNumber = await this.#getBlockNumberByHash(blockHash);

		if (blockNumber === undefined) {
			return undefined;
		}

		return this.getBlock(blockNumber);
	}

	public async getBlockHeader(blockNumber: number): Promise<Contracts.Crypto.BlockHeader | undefined> {
		const data = await this.#readBlockHeaderData(blockNumber);

		if (data) {
			const { header } = await this.blockFactory.fromStorage(data, []);
			return header;
		}

		return undefined;
	}

	public async getBlockHeaderByHash(blockHash: string): Promise<Contracts.Crypto.BlockHeader | undefined> {
		const blockNumber = await this.#getBlockNumberByHash(blockHash);

		if (blockNumber === undefined) {
			return undefined;
		}

		const data = await this.#readBlockHeaderData(blockNumber);
		if (data) {
			const { header } = await this.blockFactory.fromStorage(data, []);
			return header;
		}

		return undefined;
	}

	public async findBlocks(start: number, end: number): Promise<Contracts.Crypto.Block[]> {
		return await this.#map<Contracts.Crypto.Block>(
			await this.findCommitBuffers(start, end),
			async (block: Buffer) => (await this.commitFactory.fromBytes(block)).block,
		);
	}

	public async getTransactionByHash(transactionHash: string): Promise<Contracts.Crypto.Transaction | undefined> {
		const key = await this.storage.getTransactionKeyByHash(transactionHash);
		if (!key) {
			return undefined;
		}

		return await this.#readTransaction(key);
	}

	public async getTransactionByBlockHashAndIndex(
		blockHash: string,
		index: number,
	): Promise<Contracts.Crypto.Transaction | undefined> {
		// Verify if the block exists
		const blockNumber = await this.#getBlockNumberByHash(blockHash);
		if (blockNumber === undefined) {
			return undefined;
		}

		return this.#readTransaction(`${blockNumber}-${index}`);
	}

	public async getTransactionByBlockNumberAndIndex(
		blockNumber: number,
		index: number,
	): Promise<Contracts.Crypto.Transaction | undefined> {
		return this.#readTransaction(`${blockNumber}-${index}`);
	}

	public async *readCommits(start: number, end: number): AsyncGenerator<Contracts.Crypto.Commit> {
		for (let blockNumber = start; blockNumber <= end; blockNumber++) {
			const data = await this.#readCommitStorage(blockNumber);

			if (!data) {
				return;
			}

			const commit = await this.commitFactory.fromStorage(data);
			yield commit;
		}
	}

	public async getLastCommit(): Promise<Contracts.Crypto.Commit> {
		if (await this.isEmpty()) {
			throw new Error("Database is empty");
		}

		const data = await this.#readCommitStorage(this.#state.blockNumber);
		assert.defined(data);
		return this.commitFactory.fromStorage(data);
	}

	public async onCommit(unit: Contracts.Processor.ProcessableUnit): Promise<void> {
		const commit = await unit.getCommit();
		this.#state.blockNumber = commit.block.data.number;
		this.#state.totalRound += commit.proof.round + 1;
	}

	async #getBlockNumberByHash(blockHash: string): Promise<number | undefined> {
		return (await this.storage.getBlockNumberByHash(blockHash)) ?? undefined;
	}

	async #readCommitStorage(blockNumber: number): Promise<Contracts.Evm.CommitStorageData | undefined> {
		const result = await this.storage.getCommitData(blockNumber);

		if (!result) {
			return undefined;
		}

		return result;
	}

	async #readBlockHeaderData(blockNumber: number): Promise<Contracts.Evm.BlockHeaderStorageData | undefined | null> {
		return this.storage.getBlockHeaderData(blockNumber);
	}

	async #readTransaction(key: string): Promise<Contracts.Crypto.Transaction | undefined> {
		const transactionStorageData = await this.storage.getTransactionData(key);
		if (!transactionStorageData) {
			return undefined;
		}

		const transaction = await this.transactionFactory.fromStorage(transactionStorageData);

		assert.defined<number>(transaction.data.blockNumber);
		const blockHeaderData = await this.#readBlockHeaderData(transaction.data.blockNumber);
		assert.defined(blockHeaderData);

		transaction.data.blockHash = blockHeaderData.hash;

		return transaction;
	}

	async #map<T>(data: unknown[], callback: (...arguments_: any[]) => Promise<T>): Promise<T[]> {
		const result: T[] = [];
		for (const [index, datum] of data.entries()) {
			result[index] = await callback(datum);
		}

		return result;
	}

	*#range(start: number, end: number): Generator<number> {
		for (let index = start; index <= end; index++) {
			yield index;
		}
	}
}
