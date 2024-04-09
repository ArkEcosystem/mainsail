import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import * as lmdb from "lmdb";

@injectable()
export class DatabaseService implements Contracts.Database.DatabaseService {
	@inject(Identifiers.Database.Storage.Block)
	private readonly blockStorage!: lmdb.Database;

	@inject(Identifiers.Cryptography.Commit.Factory)
	private readonly commitFactory!: Contracts.Crypto.CommitFactory;

	#cache = new Map<number, Buffer>();

	public isEmpty(): boolean {
		return this.#cache.size === 0 && this.blockStorage.getKeysCount() === 0;
	}

	public async getCommit(height: number): Promise<Contracts.Crypto.Commit | undefined> {
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

		if (this.#cache.size > 0) {
			return await this.commitFactory.fromBytes([...this.#cache.values()].pop()!);
		}

		return await this.commitFactory.fromBytes(
			this.blockStorage.getRange({ limit: 1, reverse: true }).asArray[0].value,
		);
	}

	public addCommit(commit: Contracts.Crypto.Commit): void {
		this.#cache.set(commit.block.data.height, Buffer.from(commit.serialized, "hex"));
	}

	async persist(): Promise<void> {
		await this.blockStorage.transaction(() => {
			for (const [height, block] of this.#cache.entries()) {
				void this.blockStorage.put(height, block);
			}
		});

		await this.blockStorage.flushed;

		this.#cache.clear();
	}

	#get(height: number): Buffer {
		if (this.#cache.has(height)) {
			return this.#cache.get(height)!;
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
