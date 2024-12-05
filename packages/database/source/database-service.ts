import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { Utils } from "@mainsail/kernel";
import * as lmdb from "lmdb";

@injectable()
export class DatabaseService implements Contracts.Database.DatabaseService {
	@inject(Identifiers.Database.Root)
	private readonly rootDb!: lmdb.RootDatabase;

	@inject(Identifiers.Database.Storage.Commit)
	private readonly commitStorage!: lmdb.Database;

	@inject(Identifiers.Database.Storage.Block)
	private readonly blockStorage!: lmdb.Database;

	@inject(Identifiers.Database.Storage.BlockId)
	private readonly blockIdStorage!: lmdb.Database;

	@inject(Identifiers.Database.Storage.State)
	private readonly stateStorage!: lmdb.Database;

	@inject(Identifiers.Database.Storage.Transaction)
	private readonly transactionStorage!: lmdb.Database;

	@inject(Identifiers.Database.Storage.TransactionIds)
	private readonly transactionIdsStorage!: lmdb.Database;

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
		const bytes = this.#readCommitBytes(height);

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

		const bytes = this.#readCommitBytes(height);
		if (bytes) {
			return await this.commitFactory.fromBytes(bytes);
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

		return heights
			.map((height: number) => {
				try {
					return this.#readCommitBytes(height);
				} catch {
					return;
				}
			})
			.filter((block): block is Buffer => !!block);
	}

	public async getBlock(height: number): Promise<Contracts.Crypto.Block | undefined> {
		const bytes = this.#readBlockBytes(height);

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

		const bytes = this.#readBlockBytes(height);
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

		const transactionBytes: Buffer | undefined = this.transactionStorage.get(id);

		if (!transactionBytes) {
			return undefined;
		}

		return await this.transactionFactory.fromBytes(transactionBytes);
	}

	public async *readCommits(start: number, end: number): AsyncGenerator<Contracts.Crypto.Commit> {
		for (let height = start; height <= end; height++) {
			const data = this.#readCommitBytes(height);

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

		const height = this.blockIdStorage.getRange({ limit: 1, reverse: true }).asArray[0].value;
		return await this.commitFactory.fromBytes(this.#readCommitBytes(height)!);
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
				const buff = Buffer.from(commit.serialized, "hex"); // TODO: Slice to reduce buffer size

				void this.commitStorage.put(height, buff.subarray(0, proofSize));
				void this.blockStorage.put(height, buff.subarray(proofSize, proofSize + this.headerSize()));
				void this.transactionIdsStorage.put(
					height,
					commit.block.transactions.map((tx) => tx.id),
				);
				for (const tx of commit.block.transactions) {
					void this.transactionStorage.put(tx.id, tx.serialized);
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

	#readCommitBytes(height: number): Buffer | undefined {
		if (this.#commitCache.has(height)) {
			return Buffer.from(this.#commitCache.get(height)!.serialized, "hex");
		}

		const commitBuffer: Buffer | undefined = this.commitStorage.get(height);
		if (!commitBuffer) {
			return;
		}

		const blockBuffer: Buffer | undefined = this.#readBlockBytes(height);
		Utils.assert.defined<Buffer>(blockBuffer);

		return Buffer.concat([commitBuffer, blockBuffer]);
	}

	#readBlockBytes(height: number): Buffer | undefined {
		if (this.#commitCache.has(height)) {
			return Buffer.from(this.#commitCache.get(height)!.serialized, "hex").subarray(this.proofSize());
		}

		const blockBuffer: Buffer | undefined = this.blockStorage.get(height);
		if (!blockBuffer) {
			return;
		}

		const transactionIds: string[] | undefined = this.transactionIdsStorage.get(height);
		Utils.assert.defined<string[]>(transactionIds);

		const transactions: Buffer[] = [];
		for (const id of transactionIds) {
			const transaction: Buffer | undefined = this.transactionStorage.get(id);
			Utils.assert.defined<Buffer>(transaction);

			const sizeBuff = Buffer.alloc(2);
			sizeBuff.writeUInt16LE(transaction.length, 0);
			transactions.push(sizeBuff, transaction);
		}

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
