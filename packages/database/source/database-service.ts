import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { Utils } from "@mainsail/kernel";
import { BigNumber, sortBy, sortByDesc } from "@mainsail/utils";
import { Database } from "lmdb";

@injectable()
export class DatabaseService implements Contracts.Database.IDatabaseService {
	@inject(Identifiers.LogService)
	private readonly logger!: Contracts.Kernel.Logger;

	@inject(Identifiers.Database.BlockStorage)
	private readonly blockStorage!: Database;

	@inject(Identifiers.Database.BlockHeightStorage)
	private readonly blockStorageByHeight!: Database;

	@inject(Identifiers.Database.TransactionStorage)
	private readonly transactionStorage!: Database;

	@inject(Identifiers.Database.RoundStorage)
	private readonly roundStorage!: Database;

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
		// .sort((a: Contracts.Crypto.IBlock, b: Contracts.Crypto.IBlock) => a.data.height - b.data.height);
	}

	public async getBlocks(start: number, end: number): Promise<Contracts.Crypto.IBlockData[]> {
		return (await this.findBlocksByHeightRange(start, end)).map(({ data }) => data);
	}

	public async getBlocksForDownload(offset: number, limit: number): Promise<Contracts.Shared.DownloadBlock[]> {
		return (await this.findBlocksByHeightRange(offset, offset + limit - 1)).map(({ data, transactions }) => ({
			...data,
			transactions: transactions.map(({ serialized }) => serialized.toString("hex")),
		}));
	}

	public async findBlockByHeights(heights: number[]): Promise<Contracts.Crypto.IBlock[]> {
		// TODO: this hits the disk twice for each height
		const ids = await this.#map<string>(heights, (height: number) => this.blockStorageByHeight.get(height));

		return this.#map<Contracts.Crypto.IBlock>(
			ids.filter((id) => id !== undefined),
			async (id: string) => (await this.blockFactory.fromCommittedBytes(this.blockStorage.get(id))).block,
		);
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

	public async getRound(round: number): Promise<Contracts.Database.IRound[]> {
		const roundByNumber: Contracts.Database.IRound[] = this.roundStorage
			.get(round)
			?.map((r: { balance: string; round: number; publicKey: string }) => ({
				balance: BigNumber.make(r.balance),
				publicKey: r.publicKey,
				round: r.round,
			}));

		if (!roundByNumber) {
			return [];
		}

		return sortBy(sortByDesc(roundByNumber, "balance"), "publicKey");
	}

	public async saveRound(activeValidators: readonly Contracts.State.Wallet[]): Promise<void> {
		this.logger.info(`Saving round ${activeValidators[0].getAttribute("validator.round").toLocaleString()}`);

		const roundNumber: number = activeValidators[0].getAttribute("validator.round");

		if (!this.roundStorage.doesExist(roundNumber)) {
			await this.roundStorage.put(
				roundNumber,
				activeValidators.map((validator: Contracts.State.Wallet) => ({
					balance: validator.getAttribute("validator.voteBalance").toString(),
					publicKey: validator.getPublicKey(),
					round: validator.getAttribute("validator.round"),
				})),
			);
		}
	}

	public async deleteRound(round: number): Promise<void> {
		for (const key of this.roundStorage.getKeys({ start: round })) {
			await this.roundStorage.remove(key);
		}
	}

	public async verifyBlockchain(): Promise<boolean> {
		return true;

		// const errors: string[] = [];

		// const block: Contracts.Crypto.IBlock = await this.getLastBlock();

		// // Last block is available
		// if (!block) {
		// 	errors.push("Last block is not available");
		// }

		// const blockStats: {
		// 	numberOfTransactions: number;
		// 	totalFee: string;
		// 	totalAmount: string;
		// 	count: number;
		// } = await this.blockRepository.getStatistics();

		// // return this.createQueryBuilder()
		// // 	.select([])
		// // 	.addSelect("COALESCE(SUM(number_of_transactions), 0)", "numberOfTransactions")
		// // 	.addSelect("COALESCE(SUM(total_fee), 0)", "totalFee")
		// // 	.addSelect("COALESCE(SUM(total_amount), 0)", "totalAmount")
		// // 	.addSelect("COUNT(DISTINCT(height))", "count")
		// // 	.getRawOne();

		// const transactionStats: {
		// 	count: number;
		// 	totalFee: string;
		// 	totalAmount: string;
		// } = await this.transactionRepository.getStatistics();

		// // return this.createQueryBuilder()
		// // 	.select([])
		// // 	.addSelect("COUNT(DISTINCT(id))", "count")
		// // 	.addSelect("COALESCE(SUM(fee), 0)", "totalFee")
		// // 	.addSelect("COALESCE(SUM(amount), 0)", "totalAmount")
		// // 	.getRawOne();

		// // Last block height equals the number of stored blocks
		// if (block.data.height !== +blockStats.count) {
		// 	errors.push(
		// 		`Last block height: ${block.data.height.toLocaleString()}, number of stored blocks: ${blockStats.count}`,
		// 	);
		// }

		// // Number of stored transactions equals the sum of block.numberOfTransactions in the database
		// if (blockStats.numberOfTransactions !== transactionStats.count) {
		// 	errors.push(
		// 		`Number of transactions: ${transactionStats.count}, number of transactions included in blocks: ${blockStats.numberOfTransactions}`,
		// 	);
		// }

		// // Sum of all tx fees equals the sum of block.totalFee
		// if (blockStats.totalFee !== transactionStats.totalFee) {
		// 	errors.push(
		// 		`Total transaction fees: ${transactionStats.totalFee}, total of block.totalFee : ${blockStats.totalFee}`,
		// 	);
		// }

		// // Sum of all tx amount equals the sum of block.totalAmount
		// if (blockStats.totalAmount !== transactionStats.totalAmount) {
		// 	errors.push(
		// 		`Total transaction amounts: ${transactionStats.totalAmount}, total of block.totalAmount : ${blockStats.totalAmount}`,
		// 	);
		// }

		// const hasErrors: boolean = errors.length > 0;

		// if (hasErrors) {
		// 	this.logger.error("FATAL: The database is corrupted");
		// 	this.logger.error(JSON.stringify(errors, undefined, 4));
		// }

		// return !hasErrors;
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
