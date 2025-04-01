import { inject, injectable, tagged } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { assert, ByteBuffer } from "@mainsail/utils";

@injectable()
export class DatabaseService implements Contracts.Database.DatabaseService {
	@inject(Identifiers.Evm.Instance)
	@tagged("instance", "evm")
	private readonly storage!: Contracts.Evm.Storage;

	@inject(Identifiers.Cryptography.Commit.Factory)
	private readonly commitFactory!: Contracts.Crypto.CommitFactory;

	@inject(Identifiers.Cryptography.Block.Factory)
	private readonly blockFactory!: Contracts.Crypto.BlockFactory;

	@inject(Identifiers.Cryptography.Block.Deserializer)
	private readonly blockDeserializer!: Contracts.Crypto.BlockDeserializer;

	@inject(Identifiers.Cryptography.Transaction.Factory)
	private readonly transactionFactory!: Contracts.Crypto.TransactionFactory;

	#state = { height: 0, totalRound: 0 };

	public async initialize(): Promise<void> {
		this.#state = await this.storage.getState();
	}

	public getState(): Contracts.Database.State {
		return this.#state;
	}

	public async isEmpty(): Promise<boolean> {
		return this.storage.isEmpty();
	}

	public async getCommit(height: number): Promise<Contracts.Crypto.Commit | undefined> {
		const bytes = await this.#readCommitBytes(height);

		if (bytes) {
			return await this.commitFactory.fromBytes(bytes);
		}

		return undefined;
	}

	public async getCommitById(id: string): Promise<Contracts.Crypto.Commit | undefined> {
		const height = await this.#getHeightById(id);

		if (height === undefined) {
			return undefined;
		}

		const bytes = await this.#readCommitBytes(height);
		if (bytes) {
			return this.commitFactory.fromBytes(bytes);
		}

		return undefined;
	}

	public async hasCommitById(id: string): Promise<boolean> {
		return this.#getHeightById(id) !== undefined;
	}

	public async findCommitBuffers(start: number, end: number): Promise<Buffer[]> {
		const heights: number[] = [];

		for (const height of this.#range(start, end)) {
			heights.push(height);
		}

		const blocks = await Promise.all(
			heights.map(async (height: number) => {
				try {
					return await this.#readCommitBytes(height);
				} catch {
					return;
				}
			}),
		);

		return blocks.filter((block): block is Buffer => !!block);
	}

	public async getBlock(height: number): Promise<Contracts.Crypto.Block | undefined> {
		const bytes = await this.#readBlockBytes(height);

		if (bytes) {
			return await this.blockFactory.fromBytes(bytes);
		}

		return undefined;
	}

	public async getBlockById(id: string): Promise<Contracts.Crypto.Block | undefined> {
		const height = await this.#getHeightById(id);

		if (height === undefined) {
			return undefined;
		}

		const bytes = await this.#readBlockBytes(height);
		if (bytes) {
			return await this.blockFactory.fromBytes(bytes);
		}

		return undefined;
	}

	public async getBlockHeader(height: number): Promise<Contracts.Crypto.BlockHeader | undefined> {
		const bytes = await this.#readBlockHeaderBytes(height);

		if (bytes) {
			return await this.blockDeserializer.deserializeHeader(bytes);
		}

		return undefined;
	}

	public async getBlockHeaderById(id: string): Promise<Contracts.Crypto.BlockHeader | undefined> {
		const height = await this.#getHeightById(id);

		if (height === undefined) {
			return undefined;
		}

		const bytes = await this.#readBlockHeaderBytes(height);
		if (bytes) {
			return this.blockDeserializer.deserializeHeader(bytes);
		}

		return undefined;
	}

	public async findBlocks(start: number, end: number): Promise<Contracts.Crypto.Block[]> {
		return await this.#map<Contracts.Crypto.Block>(
			await this.findCommitBuffers(start, end),
			async (block: Buffer) => (await this.commitFactory.fromBytes(block)).block,
		);
	}

	public async getTransactionById(id: string): Promise<Contracts.Crypto.Transaction | undefined> {
		const key = await this.storage.getTransactionKeyById(id);
		if (!key) {
			return undefined;
		}

		return await this.#readTransaction(key);
	}

	public async getTransactionByBlockIdAndIndex(
		blockId: string,
		index: number,
	): Promise<Contracts.Crypto.Transaction | undefined> {
		// Verify if the block exists
		const height = await this.#getHeightById(blockId);
		if (height === undefined) {
			return undefined;
		}

		return this.#readTransaction(`${height}-${index}`);
	}

	public async getTransactionByBlockHeightAndIndex(
		height: number,
		index: number,
	): Promise<Contracts.Crypto.Transaction | undefined> {
		return this.#readTransaction(`${height}-${index}`);
	}

	public async *readCommits(start: number, end: number): AsyncGenerator<Contracts.Crypto.Commit> {
		for (let height = start; height <= end; height++) {
			const data = await this.#readCommitBytes(height);

			if (!data) {
				return;
			}

			const commit = await this.commitFactory.fromBytes(data);
			yield commit;
		}
	}

	public async getLastCommit(): Promise<Contracts.Crypto.Commit> {
		if (await this.isEmpty()) {
			throw new Error("Database is empty");
		}

		const bytes = await this.#readCommitBytes(this.#state.height);
		assert.buffer(bytes);
		return this.commitFactory.fromBytes(bytes);
	}

	public async onCommit(unit: Contracts.Processor.ProcessableUnit): Promise<void> {
		const commit = await unit.getCommit();
		this.#state.height = commit.block.data.number;
		this.#state.totalRound += commit.proof.round + 1;
	}

	async #getHeightById(id: string): Promise<number | undefined> {
		return this.storage.getBlockHeightById(id);
	}

	async #readCommitBytes(height: number): Promise<Buffer | undefined> {
		const commitBuffer = await this.storage.getProofBytes(height);
		if (!commitBuffer) {
			return;
		}

		const blockBuffer: Buffer | undefined = await this.#readBlockBytes(height);
		assert.buffer(blockBuffer);

		return Buffer.concat([commitBuffer, blockBuffer]);
	}

	async #readBlockBytes(height: number): Promise<Buffer | undefined> {
		const blockBuffer = await this.storage.getBlockHeaderBytes(height);
		if (!blockBuffer) {
			return;
		}

		const blockHeader = await this.blockDeserializer.deserializeHeader(blockBuffer);

		const transactions: Buffer[] = [];
		for (let index = 0; index < blockHeader.transactionsCount; index++) {
			const key = `${height}-${index}`;

			const transaction = await this.storage.getTransactionBytes(key);
			assert.buffer(transaction);

			const sizeBuff = ByteBuffer.fromSize(4);
			sizeBuff.writeUint32(transaction.length - 8);
			transactions.push(sizeBuff.toBuffer(), transaction.subarray(8));
		}

		return Buffer.concat([blockBuffer, ...transactions]);
	}

	async #readBlockHeaderBytes(height: number): Promise<Buffer | undefined> {
		return this.storage.getBlockHeaderBytes(height);
	}

	async #readTransaction(key: string): Promise<Contracts.Crypto.Transaction | undefined> {
		const transactionBytes = await this.storage.getTransactionBytes(key);
		assert.buffer(transactionBytes);

		const buffer = ByteBuffer.fromBuffer(transactionBytes);
		const height = buffer.readUint32();
		const transactionIndex = buffer.readUint32();
		const transaction = await this.transactionFactory.fromBytes(buffer.getRemainder());

		transaction.data.transactionIndex = transactionIndex;
		transaction.data.blockNumber = height;

		const blockBuffer = await this.#readBlockHeaderBytes(height);
		assert.buffer(blockBuffer);
		const block = await this.blockDeserializer.deserializeHeader(blockBuffer);
		transaction.data.blockHash = block.hash;

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
