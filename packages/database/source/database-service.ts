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

	@inject(Identifiers.Cryptography.Commit.ProofSize)
	private readonly proofSize!: () => number;

	@inject(Identifiers.Cryptography.Block.HeaderSize)
	private readonly headerSize!: () => number;

	#commitCache = new Map<number, Contracts.Crypto.Commit>();
	#blockIdCache = new Map<string, number>();
	#transactionCache = new Map<string, Contracts.Crypto.Transaction>();

	#state = { height: 0, totalRound: 0 };

	public async initialize(): Promise<void> {
		this.#state = await this.storage.getState();
	}

	public getState(): Contracts.Database.State {
		return this.#state;
	}

	public async isEmpty(): Promise<boolean> {
		return this.#commitCache.size === 0 && (await this.storage.isEmpty());
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
		if (this.#transactionCache.has(id)) {
			return this.#transactionCache.get(id);
		}

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

		// Get TX from cache
		if (this.#commitCache.has(height)) {
			const block = this.#commitCache.get(height)!.block;

			if (block.transactions.length <= index) {
				return undefined;
			}

			return block.transactions[index];
		}

		// Get TX from storage
		return this.#readTransaction(`${height}-${index}`);
	}

	public async getTransactionByBlockHeightAndIndex(
		height: number,
		index: number,
	): Promise<Contracts.Crypto.Transaction | undefined> {
		// Get TX from cache
		if (this.#commitCache.has(height)) {
			const block = this.#commitCache.get(height)!.block;

			if (block.transactions.length <= index) {
				return undefined;
			}

			return block.transactions[index];
		}

		// Get TX from storage
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

		if (this.#commitCache.size > 0) {
			return [...this.#commitCache.values()].pop()!;
		}

		const bytes = await this.#readCommitBytes(this.#state.height);
		assert.buffer(bytes);
		return await this.commitFactory.fromBytes(bytes);
	}

	// TODO: use CommitHandler interface?
	public addCommit(commit: Contracts.Crypto.Commit): void {
		// TODO: cache is unbounded
		this.#commitCache.set(commit.block.data.height, commit);

		// TODO: cache is unbounded
		this.#blockIdCache.set(commit.block.data.id, commit.block.data.height);

		// TODO: cache is unbounded
		for (const tx of commit.block.transactions) {
			this.#transactionCache.set(tx.id, tx);
		}

		this.#state.height = commit.block.data.height;
		this.#state.totalRound += commit.proof.round + 1;
	}

	async #getHeightById(id: string): Promise<number | undefined> {
		if (this.#blockIdCache.has(id)) {
			return this.#blockIdCache.get(id);
		}

		return this.storage.getBlockHeightById(id);
	}

	async #readCommitBytes(height: number): Promise<Buffer | undefined> {
		if (this.#commitCache.has(height)) {
			return Buffer.from(this.#commitCache.get(height)!.serialized, "hex");
		}

		const commitBuffer = await this.storage.getProofBytes(height);
		if (!commitBuffer) {
			return;
		}

		const blockBuffer: Buffer | undefined = await this.#readBlockBytes(height);
		assert.buffer(blockBuffer);

		return Buffer.concat([commitBuffer, blockBuffer]);
	}

	async #readBlockBytes(height: number): Promise<Buffer | undefined> {
		if (this.#commitCache.has(height)) {
			return Buffer.from(this.#commitCache.get(height)!.serialized, "hex").subarray(this.proofSize());
		}

		const blockBuffer = await this.storage.getBlockHeaderBytes(height);
		if (!blockBuffer) {
			return;
		}

		const blockHeader = await this.blockDeserializer.deserializeHeader(blockBuffer);

		const transactions: Buffer[] = [];
		for (let index = 0; index < blockHeader.numberOfTransactions; index++) {
			const key = `${height}-${index}`;

			const transaction = await this.storage.getTransactionBytes(key);
			assert.buffer(transaction);

			const sizeBuff = ByteBuffer.fromSize(4);
			sizeBuff.writeUint32(transaction.length - 8);
			transactions.push(sizeBuff.toBuffer(), transaction.subarray(8));
		}

		// TODO: we store all ids but never use it
		// const transactionIds: string[] | undefined = this.transactionIdStorage.get(height);
		// assert.defined(transactionIds);

		return Buffer.concat([blockBuffer, ...transactions]);
	}

	async #readBlockHeaderBytes(height: number): Promise<Buffer | undefined> {
		if (this.#commitCache.has(height)) {
			return Buffer.from(this.#commitCache.get(height)!.serialized, "hex").subarray(
				this.proofSize(),
				this.proofSize() + this.headerSize(),
			);
		}

		return this.storage.getBlockHeaderBytes(height);
	}

	async #readTransaction(key: string): Promise<Contracts.Crypto.Transaction | undefined> {
		const transactionBytes = await this.storage.getTransactionBytes(key);
		assert.buffer(transactionBytes);

		const buffer = ByteBuffer.fromBuffer(transactionBytes);
		const height = buffer.readUint32();
		const sequence = buffer.readUint32();
		const transaction = await this.transactionFactory.fromBytes(buffer.getRemainder());

		transaction.data.sequence = sequence;
		transaction.data.blockHeight = height;

		const blockBuffer = await this.#readBlockHeaderBytes(height);
		assert.buffer(blockBuffer);
		const block = await this.blockDeserializer.deserializeHeader(blockBuffer);
		transaction.data.blockId = block.id;

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
