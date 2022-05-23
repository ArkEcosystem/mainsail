import { inject, injectable } from "@arkecosystem/core-container";
import { Contracts, Identifiers } from "@arkecosystem/core-contracts";
import { BigNumber, sortBy, sortByDesc } from "@arkecosystem/utils";
import lmdb from "lmdb";

@injectable()
export class DatabaseService implements Contracts.Database.IDatabaseService {
	@inject(Identifiers.LogService)
	private readonly logger: Contracts.Kernel.Logger;

	@inject(Identifiers.Database.BlockStorage)
	private readonly blockStorage: lmdb.Database;

	@inject(Identifiers.Database.BlockHeightStorage)
	private readonly blockStorageById: lmdb.Database;

	@inject(Identifiers.Database.TransactionStorage)
	private readonly transactionStorage: lmdb.Database;

	@inject(Identifiers.Database.RoundStorage)
	private readonly roundStorage: lmdb.Database;

	@inject(Identifiers.Cryptography.Block.Factory)
	private readonly blockFactory: Contracts.Crypto.IBlockFactory;

	@inject(Identifiers.Cryptography.Transaction.Factory)
	private readonly transactionFactory: Contracts.Crypto.ITransactionFactory;

	public async getBlock(id: string): Promise<Contracts.Crypto.IBlock | undefined> {
		return this.blockFactory.fromBytes(this.blockStorage.get(id));
	}

	public async findBlocksByHeightRange(start: number, end: number): Promise<Contracts.Crypto.IBlock[]> {
		const heights: number[] = [];

		for (const height of this.#range(start, end)) {
			heights.push(height);
		}

		return (
			await this.#map<Contracts.Crypto.IBlock>(
				heights
					.map((height: number) => {
						try {
							return this.blockStorage.get(this.blockStorageById.get(height));
						} catch {
							return;
						}
					})
					.filter(Boolean),
				(block: Buffer) => this.blockFactory.fromBytes(block),
			)
		).sort((a: Contracts.Crypto.IBlock, b: Contracts.Crypto.IBlock) => a.data.height - b.data.height);
	}

	public async getBlocks(start: number, end: number, headersOnly?: boolean): Promise<Contracts.Crypto.IBlockData[]> {
		return (await this.findBlocksByHeightRange(start, end)).map(({ data }) => data);
	}

	public async getBlocksForDownload(
		offset: number,
		limit: number,
		headersOnly?: boolean,
	): Promise<Contracts.Shared.DownloadBlock[]> {
		return (await this.findBlocksByHeightRange(offset, offset + limit - 1)).map(({ data, transactions }) => ({
			...data,
			transactions: transactions.map(({ serialized }) => serialized.toString("hex")),
		}));
	}

	public async findBlockByHeights(heights: number[]): Promise<Contracts.Crypto.IBlock[]> {
		return this.#map<Contracts.Crypto.IBlock>(heights, (height: number) =>
			this.blockFactory.fromBytes(this.blockStorage.get(height)),
		);
	}

	public async getLastBlock(): Promise<Contracts.Crypto.IBlock | undefined> {
		try {
			return this.blockFactory.fromBytes(
				this.blockStorage.getRange({ limit: 1, reverse: true }).asArray[0].value,
			);
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

	public async saveBlocks(blocks: Contracts.Crypto.IBlock[]): Promise<void> {
		for (const block of blocks) {
			const blockID: string | undefined = block.data.id;

			if (!blockID) {
				throw new Error(`Failed to store block ${block.data.height} because it has no ID.`);
			}

			await this.blockStorage.ifNoExists(blockID, async () => {
				await this.blockStorage.put(blockID, Buffer.from(block.serialized, "hex"));

				await this.blockStorageById.put(block.data.height, blockID);

				for (const transaction of block.transactions) {
					await this.transactionStorage.put(transaction.data.id, transaction.serialized);
				}
			});
		}
	}

	public async findBlocksByIds(ids: any[]): Promise<Contracts.Crypto.IBlockData[]> {
		return this.#map(
			ids,
			async (id: string) => (await this.blockFactory.fromBytes(this.blockStorage.get(id))).data,
		);
	}

	public async getRound(round: number): Promise<Contracts.Database.IRound[]> {
		const roundByNumber: Contracts.Database.IRound[] = this.roundStorage
			.get(round)
			?.map((r: { balance: string; round: string; publicKey: string }) => ({
				balance: BigNumber.make(r.balance),
				publicKey: r.publicKey,
				round: BigNumber.make(r.round),
			}));

		if (!roundByNumber) {
			return [];
		}

		return sortBy(sortByDesc(roundByNumber, "balance"), "publicKey");
	}

	public async saveRound(activeValidators: readonly Contracts.State.Wallet[]): Promise<void> {
		this.logger.info(`Saving round ${activeValidators[0].getAttribute("validator.round").toLocaleString()}`);

		const roundNumber: number = activeValidators[0].getAttribute("validator.round");

		await this.roundStorage.ifNoExists(roundNumber, async () => {
			await this.roundStorage.put(
				roundNumber,
				activeValidators.map((validator: Contracts.State.Wallet) => ({
					balance: validator.getAttribute("validator.voteBalance").toString(),
					publicKey: validator.getPublicKey(),
					round: validator.getAttribute("validator.round").toString(),
				})),
			);
		});
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

	async #map<T>(data: unknown[], callback: Function): Promise<T[]> {
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
