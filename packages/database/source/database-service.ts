import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { Utils } from "@mainsail/kernel";
import { ByteBuffer } from "@mainsail/utils";
import type { Database, RootDatabase } from "lmdb";

@injectable()
export class DatabaseService implements Contracts.Database.DatabaseService {
	@inject(Identifiers.Database.Root)
	private readonly rootDb!: RootDatabase;

	@inject(Identifiers.Database.Storage.Commit)
	private readonly commitStorage!: Database;

	@inject(Identifiers.Database.Storage.Block)
	private readonly blockStorage!: Database;

	@inject(Identifiers.Database.Storage.BlockId)
	private readonly blockIdStorage!: Database;

	@inject(Identifiers.Database.Storage.State)
	private readonly stateStorage!: Database;

	@inject(Identifiers.Database.Storage.Transaction)
	private readonly transactionStorage!: Database;

	@inject(Identifiers.Database.Storage.TransactionId)
	private readonly transactionIdStorage!: Database;

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
		if (this.isEmpty()) {
			await this.rootDb.transaction(() => {
				void this.stateStorage.put("state", this.#state);
			});
			await this.rootDb.flushed;
		}

		this.#state = this.stateStorage.get("state");
	}

	public getState(): Contracts.Database.State {
		return this.#state;
	}

	public isEmpty(): boolean {
		return this.#commitCache.size === 0 && this.blockStorage.getKeysCount() === 0;
	}

	public async getCommit(height: number): Promise<Contracts.Crypto.Commit | undefined> {
		const bytes = await this.#readCommitBytes(height);

		if (bytes) {
			return await this.commitFactory.fromBytes(bytes);
		}

		return undefined;
	}

	public async getCommitById(id: string): Promise<Contracts.Crypto.Commit | undefined> {
		const height = this.#getHeightById(id);

		if (height === undefined) {
			return undefined;
		}

		const bytes = await this.#readCommitBytes(height);
		if (bytes) {
			return this.commitFactory.fromBytes(bytes);
		}

		return undefined;
	}

	public hasCommitById(id: string): boolean {
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
		const height = this.#getHeightById(id);

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
		const bytes = this.#readBlockHeaderBytes(height);

		if (bytes) {
			return await this.blockDeserializer.deserializeHeader(bytes);
		}

		return undefined;
	}

	public async getBlockHeaderById(id: string): Promise<Contracts.Crypto.BlockHeader | undefined> {
		const height = this.#getHeightById(id);

		if (height === undefined) {
			return undefined;
		}

		const bytes = this.#readBlockHeaderBytes(height);
		if (bytes) {
			return await this.blockDeserializer.deserializeHeader(bytes);
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

		const key: string | undefined = this.transactionIdStorage.get(id);
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
		const height = this.#getHeightById(blockId);
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
		if (this.isEmpty()) {
			throw new Error("Database is empty");
		}

		if (this.#commitCache.size > 0) {
			return [...this.#commitCache.values()].pop()!;
		}

		const bytes = await this.#readCommitBytes(this.#state.height);
		Utils.assert.defined<Buffer>(bytes);
		return await this.commitFactory.fromBytes(bytes);
	}

	public addCommit(commit: Contracts.Crypto.Commit): void {
		this.#commitCache.set(commit.block.data.height, commit);
		this.#blockIdCache.set(commit.block.data.id, commit.block.data.height);

		for (const tx of commit.block.transactions) {
			this.#transactionCache.set(tx.id, tx);
		}

		this.#state.height = commit.block.data.height;
		this.#state.totalRound += commit.proof.round + 1;
	}

	async persist(): Promise<void> {
		await this.rootDb.transaction(() => {
			for (const [height, commit] of this.#commitCache.entries()) {
				const proofSize = this.proofSize();
				const headerSize = this.headerSize();

				const buff = Buffer.from(commit.serialized.slice(0, (proofSize + headerSize) * 2), "hex");

				void this.commitStorage.put(height, buff.subarray(0, proofSize));
				void this.blockStorage.put(height, buff.subarray(proofSize, proofSize + headerSize));
				void this.transactionIdStorage.put(
					height,
					commit.block.transactions.map((tx) => tx.id),
				);

				for (const tx of commit.block.transactions) {
					Utils.assert.defined<number>(tx.data.sequence);
					const key = `${height}-${tx.data.sequence}`;
					void this.transactionIdStorage.put(tx.id, key);

					const buff = ByteBuffer.fromSize(tx.serialized.length + 8);
					buff.writeUint32(height);
					buff.writeUint32(tx.data.sequence);
					buff.writeBytes(tx.serialized);

					void this.transactionStorage.put(key, buff.toBuffer());
				}
				void this.blockIdStorage.put(commit.block.data.id, height);
			}

			void this.stateStorage.put("state", this.#state);
		});

		await this.rootDb.flushed;

		this.#commitCache.clear();
	}

	#getHeightById(id: string): number | undefined {
		if (this.#blockIdCache.has(id)) {
			return this.#blockIdCache.get(id);
		}

		return this.blockIdStorage.get(id);
	}

	async #readCommitBytes(height: number): Promise<Buffer | undefined> {
		if (this.#commitCache.has(height)) {
			return Buffer.from(this.#commitCache.get(height)!.serialized, "hex");
		}

		const commitBuffer: Buffer | undefined = this.commitStorage.get(height);
		if (!commitBuffer) {
			return;
		}

		const blockBuffer: Buffer | undefined = await this.#readBlockBytes(height);
		Utils.assert.defined<Buffer>(blockBuffer);

		return Buffer.concat([commitBuffer, blockBuffer]);
	}

	async #readBlockBytes(height: number): Promise<Buffer | undefined> {
		if (this.#commitCache.has(height)) {
			return Buffer.from(this.#commitCache.get(height)!.serialized, "hex").subarray(this.proofSize());
		}

		const blockBuffer: Buffer | undefined = this.blockStorage.get(height);
		if (!blockBuffer) {
			return;
		}

		const blockHeader = await this.blockDeserializer.deserializeHeader(blockBuffer);

		const transactions: Buffer[] = [];
		for (let index = 0; index < blockHeader.numberOfTransactions; index++) {
			const key = `${height}-${index}`;
			const transaction: Buffer | undefined = this.transactionStorage.get(key);
			Utils.assert.defined<Buffer>(transaction);

			const sizeBuff = ByteBuffer.fromSize(2);
			sizeBuff.writeUint16(transaction.length - 8);
			transactions.push(sizeBuff.toBuffer(), transaction.subarray(8));
		}

		const transactionIds: string[] | undefined = this.transactionIdStorage.get(height);
		Utils.assert.defined<string[]>(transactionIds);

		return Buffer.concat([blockBuffer, ...transactions]);
	}

	#readBlockHeaderBytes(height: number): Buffer | undefined {
		if (this.#commitCache.has(height)) {
			return Buffer.from(this.#commitCache.get(height)!.serialized, "hex").subarray(
				this.proofSize(),
				this.proofSize() + this.headerSize(),
			);
		}

		return this.blockStorage.get(height);
	}

	async #readTransaction(key): Promise<Contracts.Crypto.Transaction | undefined> {
		const transactionBytes: Buffer | undefined = this.transactionStorage.get(key);
		Utils.assert.defined<Buffer>(transactionBytes);

		const buffer = ByteBuffer.fromBuffer(transactionBytes);
		const height = buffer.readUint32();
		const sequence = buffer.readUint32();
		const transaction = await this.transactionFactory.fromBytes(buffer.getRemainder());

		transaction.data.sequence = sequence;
		transaction.data.blockHeight = height;

		const blockBuffer = this.#readBlockHeaderBytes(height);
		Utils.assert.defined<Buffer>(blockBuffer);
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
