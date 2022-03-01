import Interfaces, { BINDINGS, ITransactionFactory } from "@arkecosystem/core-crypto-contracts";
import { Container, Contracts, Utils as AppUtils } from "@arkecosystem/core-kernel";

import { Block } from "./models/block";
import { Transaction } from "./models/transaction";

@Container.injectable()
export class ModelConverter implements Contracts.Database.ModelConverter {
	@Container.inject(BINDINGS.Transaction.Factory)
	private readonly transactionFactory: ITransactionFactory;

	public async getBlockModels(blocks: Interfaces.IBlock[]): Promise<Contracts.Database.BlockModel[]> {
		return blocks.map((b) => Object.assign(new Block(), b.data));
	}

	public async getBlockData(models: Contracts.Database.BlockModel[]): Promise<Interfaces.IBlockData[]> {
		return models;
	}

	public async getBlockDataWithTransactionData(
		blockModels: Contracts.Database.BlockModel[],
		transactionModels: Contracts.Database.TransactionModel[],
	): Promise<Contracts.Shared.BlockDataWithTransactionData[]> {
		const blockData = await this.getBlockData(blockModels);
		const transactionData = await this.getTransactionData(transactionModels);

		return blockData.map((data) => {
			const transactions = transactionData.filter((t) => t.blockId === data.id);
			return { data, transactions };
		});
	}

	public async getTransactionModels(
		transactions: Interfaces.ITransaction[],
	): Promise<Contracts.Database.TransactionModel[]> {
		return transactions.map((t) =>
			Object.assign(new Transaction(), t.data, {
				serialized: t.serialized,
				timestamp: t.timestamp,
			}),
		);
	}

	public async getTransactionData(
		models: Contracts.Database.TransactionModel[],
	): Promise<Interfaces.ITransactionData[]> {
		for (let index = 0; index < models.length; index++) {
			const model = models[index];
			const { data } = await this.transactionFactory.fromBytesUnsafe(model.serialized, model.id);

			// set_row_nonce trigger
			data.nonce = model.nonce;

			// block constructor
			data.blockId = model.blockId;
			data.blockHeight = model.blockHeight;
			data.sequence = model.sequence;

			// @ts-ignore
			models[index] = data;
		}

		return models;
	}

	public async getTransactionDataWithBlockData(
		transactionModels: Contracts.Database.TransactionModel[],
		blockModels: Contracts.Database.BlockModel[],
	): Promise<Contracts.Shared.TransactionDataWithBlockData[]> {
		const transactionData = await this.getTransactionData(transactionModels);
		const blockData = await this.getBlockData(blockModels);

		return transactionData.map((data) => {
			const block = blockData.find((b) => b.id === data.blockId);
			AppUtils.assert.defined<Interfaces.IBlockData>(block);
			return { block, data };
		});
	}
}
