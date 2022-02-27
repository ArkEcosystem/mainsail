import Interfaces from "@arkecosystem/core-crypto-contracts";

import { BlockDataWithTransactionData } from "../shared/block-history-service";
import { TransactionDataWithBlockData } from "../shared/transaction-history-service";
import { BlockModel, TransactionModel } from "./models";

export interface ModelConverter {
	getBlockModels(blocks: Interfaces.IBlock[]): Promise<BlockModel[]>;
	getBlockData(models: BlockModel[]): Promise<Interfaces.IBlockData[]>;
	getBlockDataWithTransactionData(
		blockModels: BlockModel[],
		transactionModels: TransactionModel[],
	): Promise<BlockDataWithTransactionData[]>;

	getTransactionModels(transactions: Interfaces.ITransaction[]): Promise<TransactionModel[]>;
	getTransactionData(models: TransactionModel[]): Promise<Interfaces.ITransactionData[]>;
	getTransactionDataWithBlockData(
		transactionModels: TransactionModel[],
		blockModels: BlockModel[],
	): Promise<TransactionDataWithBlockData[]>;
}
