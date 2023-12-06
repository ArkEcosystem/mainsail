import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { Database } from "lmdb";

@injectable()
export class DatabaseService implements Contracts.Database.IDatabaseService {
	@inject(Identifiers.Database.BlockStorage)
	private readonly blockStorage!: Database;

	@inject(Identifiers.Cryptography.Block.Factory)
	private readonly blockFactory!: Contracts.Crypto.IBlockFactory;

	#cache = new Map<number, Buffer>();

	public async getBlock(height: number): Promise<Contracts.Crypto.IBlock | undefined> {
		const bytes = this.#get(height);

		if (bytes) {
			return (await this.blockFactory.fromCommittedBytes(bytes)).block;
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

	public async findBlocks(start: number, end: number): Promise<Contracts.Crypto.IBlock[]> {
		return await this.#map<Contracts.Crypto.IBlock>(
			await this.findCommitBuffers(start, end),
			async (block: Buffer) => (await this.blockFactory.fromCommittedBytes(block)).block,
		);
	}

	public async *readCommits(start: number, end: number): AsyncGenerator<Contracts.Crypto.ICommittedBlock> {
		for (let height = start; height <= end; height++) {
			const block = await this.blockFactory.fromCommittedBytes(this.#get(height));
			yield block;
		}
	}

	public async getLastBlock(): Promise<Contracts.Crypto.IBlock | undefined> {
		if (this.#cache.size > 0) {
			return (await this.blockFactory.fromCommittedBytes([...this.#cache.values()].pop()!)).block;
		}

		try {
			const lastCommittedBlock = await this.blockFactory.fromCommittedBytes(
				this.blockStorage.getRange({ limit: 1, reverse: true }).asArray[0].value,
			);

			return lastCommittedBlock.block;
		} catch {
			return undefined;
		}
	}

	public addCommit(block: Contracts.Crypto.ICommittedBlock): void {
		this.#cache.set(block.block.data.height, Buffer.from(block.serialized, "hex"));
	}

	async persist(): Promise<void> {
		for (const [height, block] of this.#cache.entries()) {
			void this.blockStorage.put(height, block);
		}

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
