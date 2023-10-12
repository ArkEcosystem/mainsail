import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { Utils } from "@mainsail/kernel";
import { Database } from "lmdb";

@injectable()
export class DatabaseService implements Contracts.Database.IDatabaseService {
	@inject(Identifiers.Database.BlockStorage)
	private readonly blockStorage!: Database;

	@inject(Identifiers.Database.BlockHeightStorage)
	private readonly blockStorageByHeight!: Database;

	@inject(Identifiers.Database.TransactionStorage)
	private readonly transactionStorage!: Database;

	@inject(Identifiers.Cryptography.Block.Factory)
	private readonly blockFactory!: Contracts.Crypto.IBlockFactory;

	@inject(Identifiers.Cryptography.Transaction.Factory)
	private readonly transactionFactory!: Contracts.Crypto.ITransactionFactory;

	public async getBlock(id: string): Promise<Contracts.Crypto.IBlock | undefined> {
		const bytes = this.blockStorage.get(id);

		if (bytes) {
			return (await this.blockFactory.fromCommittedBytes(bytes)).block;
		}

		return undefined;
	}

	public async getBlockByHeight(height: number): Promise<Contracts.Crypto.IBlock | undefined> {
		const id = this.blockStorageByHeight.get(height);

		if (id) {
			return this.getBlock(id);
		}

		return undefined;
	}

	public async findCommittedBlocks(start: number, end: number): Promise<Buffer[]> {
		const heights: number[] = [];

		for (const height of this.#range(start, end)) {
			heights.push(height);
		}

		return heights
			.map((height: number) => {
				try {
					return this.blockStorage.get(this.blockStorageByHeight.get(height));
				} catch {
					return;
				}
			})
			.filter(Boolean);
	}

	public async findBlocksByHeightRange(start: number, end: number): Promise<Contracts.Crypto.IBlock[]> {
		return await this.#map<Contracts.Crypto.IBlock>(
			await this.findCommittedBlocks(start, end),
			async (block: Buffer) => (await this.blockFactory.fromCommittedBytes(block)).block,
		);
	}

	public async getBlocks(start: number, end: number): Promise<Contracts.Crypto.IBlockData[]> {
		return (await this.findBlocksByHeightRange(start, end)).map(({ data }) => data);
	}

	public async findBlockByHeights(heights: number[]): Promise<Contracts.Crypto.IBlock[]> {
		// TODO: this hits the disk twice for each height
		const ids = await this.#map<string>(heights, (height: number) => this.blockStorageByHeight.get(height));

		return this.#map<Contracts.Crypto.IBlock>(
			ids.filter((id) => id !== undefined),
			async (id: string) => (await this.blockFactory.fromCommittedBytes(this.blockStorage.get(id))).block,
		);
	}

	public async *readCommittedBlocksByHeight(
		start: number,
		end: number,
	): AsyncGenerator<Contracts.Crypto.ICommittedBlock> {
		for (let height = start; height <= end; height++) {
			const id = this.blockStorageByHeight.get(height);
			const block = await this.blockFactory.fromCommittedBytes(this.blockStorage.get(id));
			yield block;
		}
	}

	public async getLastBlock(): Promise<Contracts.Crypto.IBlock | undefined> {
		try {
			const lastCommittedBlock = await this.blockFactory.fromCommittedBytes(
				this.blockStorage.get(this.blockStorageByHeight.getRange({ limit: 1, reverse: true }).asArray[0].value),
			);

			// TODO: return committed block or even have a dedicated storage for it?
			return lastCommittedBlock.block;
		} catch {
			return undefined;
		}
	}

	public async getTransaction(id: string): Promise<Contracts.Crypto.ITransaction | undefined> {
		const transaction = this.transactionStorage.get(id);

		if (transaction) {
			return this.transactionFactory.fromBytes(transaction);
		}

		return undefined;
	}

	public async saveBlocks(blocks: Contracts.Crypto.ICommittedBlock[]): Promise<void> {
		for (const { serialized, block } of blocks) {
			if (!this.blockStorage.doesExist(block.data.id)) {
				// TODO: store commits

				await this.blockStorage.put(block.data.id, Buffer.from(serialized, "hex"));

				await this.blockStorageByHeight.put(block.data.height, block.data.id);

				for (const transaction of block.transactions) {
					Utils.assert.defined<string>(transaction.data.id);
					await this.transactionStorage.put(transaction.data.id, transaction.serialized);
				}
			}
		}
	}

	public async findBlocksByIds(ids: string[]): Promise<Contracts.Crypto.IBlockData[]> {
		const blocks = await this.#map<Buffer | undefined>(ids, (id: string) => this.blockStorage.get(id));

		return this.#map(
			blocks.filter((block) => block !== undefined),
			async (block: Buffer) => (await this.blockFactory.fromCommittedBytes(block)).block.data,
		);
	}

	public async getForgedTransactionsIds(ids: string[]): Promise<string[]> {
		const result: string[] = [];

		for (const id of ids) {
			const transaction = this.transactionStorage.get(id);

			if (transaction) {
				result.push(id);
			}
		}

		return result;
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
