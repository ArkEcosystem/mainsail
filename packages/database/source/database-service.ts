import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { Database } from "lmdb";

@injectable()
export class DatabaseService implements Contracts.Database.IDatabaseService {
	@inject(Identifiers.Database.BlockStorage)
	private readonly blockStorage!: Database;

	@inject(Identifiers.Cryptography.Block.Factory)
	private readonly blockFactory!: Contracts.Crypto.IBlockFactory;

	public async getBlock(height: number): Promise<Contracts.Crypto.IBlock | undefined> {
		const bytes = this.blockStorage.get(height);

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
					return this.blockStorage.get(height);
				} catch {
					return;
				}
			})
			.filter(Boolean);
	}

	public async findBlocks(start: number, end: number): Promise<Contracts.Crypto.IBlock[]> {
		return await this.#map<Contracts.Crypto.IBlock>(
			await this.findCommitBuffers(start, end),
			async (block: Buffer) => (await this.blockFactory.fromCommittedBytes(block)).block,
		);
	}

	public async *readCommits(start: number, end: number): AsyncGenerator<Contracts.Crypto.ICommittedBlock> {
		for (let height = start; height <= end; height++) {
			const block = await this.blockFactory.fromCommittedBytes(this.blockStorage.get(height));
			yield block;
		}
	}

	public async getLastBlock(): Promise<Contracts.Crypto.IBlock | undefined> {
		try {
			const lastCommittedBlock = await this.blockFactory.fromCommittedBytes(
				this.blockStorage.getRange({ limit: 1, reverse: true }).asArray[0].value,
			);

			// TODO: return committed block or even have a dedicated storage for it?
			return lastCommittedBlock.block;
		} catch {
			return undefined;
		}
	}

	public async saveBlock(block: Contracts.Crypto.ICommittedBlock): Promise<void> {
		if (!this.blockStorage.doesExist(block.block.data.id)) {
			await this.blockStorage.put(block.block.data.height, Buffer.from(block.serialized, "hex"));
		}
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
