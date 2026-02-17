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
				const commitStorage = await this.#readCommitStorage(blockNumber);
				if (!commitStorage) {
					return;
				}

				console.log("COMMIT STORAGE", commitStorage.transactions[53]);
				console.log("COMMIT DATA", commitStorage.transactions[53].data.toString("hex"));

				const commit = await this.commitFactory.fromStorage(commitStorage);
				return Buffer.from(commit.serialized, "hex");
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
			return this.blockFactory.headerFromStorage(data);
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
			return this.blockFactory.headerFromStorage(data);
		}

		return undefined;
	}

	public async findBlocks(start: number, end: number): Promise<Contracts.Crypto.Block[]> {
		const commitBuffers = await this.findCommitBuffers(start, end);

		return await this.#map(
			commitBuffers,
			async (block: Buffer) => (await this.commitFactory.fromBytes(block)).block,
		);
	}

	public async getTransactionByHash(transactionHash: string): Promise<Contracts.Crypto.BlockTransaction | undefined> {
		const key = await this.storage.getTransactionKeyByHash(transactionHash);
		if (!key) {
			return undefined;
		}

		return await this.#readTransaction(key);
	}

	public async getTransactionByBlockHashAndIndex(
		blockHash: string,
		index: number,
	): Promise<Contracts.Crypto.BlockTransaction | undefined> {
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
	): Promise<Contracts.Crypto.BlockTransaction | undefined> {
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
		this.#state.blockNumber = commit.block.number;
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

	async #readTransaction(key: string): Promise<Contracts.Crypto.BlockTransaction | undefined> {
		const transactionStorageData = await this.storage.getTransactionData(key);
		if (!transactionStorageData) {
			return undefined;
		}

		const blockHeaderData = await this.#readBlockHeaderData(transactionStorageData.blockNumber);
		assert.defined(blockHeaderData);

		return this.transactionFactory.fromStorage({ ...transactionStorageData, blockHash: blockHeaderData.hash });
	}

	async #map<T, U>(data: U[], callback: (...arguments_: U[]) => Promise<T>): Promise<T[]> {
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
