import { IBlock, IBlockData, ITransaction, ITransactionData } from "../crypto";
import { BlockDataWithTransactionData } from "../shared/block-history-service";
import { TransactionDataWithBlockData } from "../shared/transaction-history-service";
import { BlockModel, TransactionModel } from "./models";

export interface ModelConverter {
	getBlockModels(blocks: IBlock[]): Promise<BlockModel[]>;
	getBlockData(models: BlockModel[]): Promise<IBlockData[]>;
	getBlockDataWithTransactionData(
		blockModels: BlockModel[],
		transactionModels: TransactionModel[],
	): Promise<BlockDataWithTransactionData[]>;

	getTransactionModels(transactions: ITransaction[]): Promise<TransactionModel[]>;
	getTransactionData(models: TransactionModel[]): Promise<ITransactionData[]>;
	getTransactionDataWithBlockData(
		transactionModels: TransactionModel[],
		blockModels: BlockModel[],
	): Promise<TransactionDataWithBlockData[]>;
}
