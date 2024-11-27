import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import * as lmdb from "lmdb";

@injectable()
export class DatabaseService implements Contracts.Database.DatabaseService {
	@inject(Identifiers.Database.Root)
	private readonly rootDb!: lmdb.RootDatabase;

	@inject(Identifiers.Database.Storage.Block)
	private readonly blockStorage!: lmdb.Database;

	@inject(Identifiers.Database.Storage.BlockId)
	private readonly blockIdStorage!: lmdb.Database;

	@inject(Identifiers.Database.Storage.State)
	private readonly stateStorage!: lmdb.Database;

	@inject(Identifiers.Cryptography.Commit.Factory)
	private readonly commitFactory!: Contracts.Crypto.CommitFactory;

	#blockCache = new Map<number, Contracts.Crypto.Commit>();
	#blockIdCache = new Map<string, number>();
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
		return this.#blockCache.size === 0 && this.blockStorage.getKeysCount() === 0;
	}

	public async getCommit(height: number): Promise<Contracts.Crypto.Commit | undefined> {
		const bytes = this.#get(height);

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

		const bytes = this.#get(height);
		if (bytes) {
			return await this.commitFactory.fromBytes(bytes);
		}

		return undefined;
	}

	public async findCommitBuffers(start: number, end: number): Promise<Buffer[]> {
		const heights: number[] = [];

		for (const height of this.#range(start, end)) {
			heights.push(height);
		}

		return heights
			.map((height: number) => {
				try {
					return this.#get(height);
				} catch {
					return;
				}
			})
			.filter((block): block is Buffer => !!block);
	}

	public async findBlocks(start: number, end: number): Promise<Contracts.Crypto.Block[]> {
		return await this.#map<Contracts.Crypto.Block>(
			await this.findCommitBuffers(start, end),
			async (block: Buffer) => (await this.commitFactory.fromBytes(block)).block,
		);
	}

	public async findCommits(start: number, end: number): Promise<Contracts.Crypto.Commit[]> {
		return await this.#map<Contracts.Crypto.Commit>(
			await this.findCommitBuffers(start, end),
			async (block: Buffer) => await this.commitFactory.fromBytes(block),
		);
	}

	public async *readCommits(start: number, end: number): AsyncGenerator<Contracts.Crypto.Commit> {
		for (let height = start; height <= end; height++) {
			const data = this.#get(height);

			if (!data) {
				throw new Error(`Failed to read commit at height ${height}`);
			}

			const commit = await this.commitFactory.fromBytes(data);
			yield commit;
		}
	}

	public async getLastCommit(): Promise<Contracts.Crypto.Commit> {
		if (this.isEmpty()) {
			throw new Error("Database is empty");
		}

		if (this.#blockCache.size > 0) {
			return [...this.#blockCache.values()].pop()!;
		}

		return await this.commitFactory.fromBytes(
			this.blockStorage.getRange({ limit: 1, reverse: true }).asArray[0].value,
		);
	}

	public addCommit(commit: Contracts.Crypto.Commit): void {
		this.#blockCache.set(commit.block.data.height, commit);
		this.#blockIdCache.set(commit.block.data.id, commit.block.data.height);

		this.#state.height = commit.block.data.height;
		this.#state.totalRound += commit.proof.round + 1;
	}

	async persist(): Promise<void> {
		await this.rootDb.transaction(() => {
			for (const [height, commit] of this.#blockCache.entries()) {
				void this.blockStorage.put(height, Buffer.from(commit.serialized, "hex"));
				void this.blockIdStorage.put(commit.block.data.id, height);
			}

			void this.stateStorage.put("state", this.#state);
		});

		await this.rootDb.flushed;

		this.#blockCache.clear();
	}

	#get(height: number): Buffer | undefined {
		if (this.#blockCache.has(height)) {
			return Buffer.from(this.#blockCache.get(height)!.serialized, "hex");
		}

		return this.blockStorage.get(height);
	}

	#getHeightById(id: string): number | undefined {
		if (this.#blockIdCache.has(id)) {
			return this.#blockIdCache.get(id);
		}

		return this.blockIdStorage.get(id);
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
