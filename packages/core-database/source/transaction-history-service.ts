import Contracts, { Crypto, Identifiers } from "@arkecosystem/core-contracts";
import { inject, injectable } from "@arkecosystem/core-container";
import assert from "assert";

import { BlockRepository } from "./repositories/block-repository";
import { TransactionRepository } from "./repositories/transaction-repository";

@injectable()
export class TransactionHistoryService implements Contracts.Shared.TransactionHistoryService {
	@inject(Identifiers.DatabaseBlockRepository)
	private readonly blockRepository!: BlockRepository;

	@inject(Identifiers.DatabaseTransactionRepository)
	private readonly transactionRepository!: TransactionRepository;

	@inject(Identifiers.DatabaseTransactionFilter)
	private readonly transactionFilter!: Contracts.Database.TransactionFilter;

	@inject(Identifiers.DatabaseBlockFilter)
	private readonly blockFilter!: Contracts.Database.BlockFilter;

	@inject(Identifiers.DatabaseModelConverter)
	private readonly modelConverter!: Contracts.Database.ModelConverter;

	public async findOneByCriteria(
		criteria: Contracts.Shared.OrTransactionCriteria,
	): Promise<Crypto.ITransactionData | undefined> {
		const data = await this.findManyByCriteria(criteria);
		assert(data.length <= 1);
		return data[0];
	}

	public async findManyByCriteria(
		criteria: Contracts.Shared.OrTransactionCriteria,
	): Promise<Crypto.ITransactionData[]> {
		const expression = await this.transactionFilter.getExpression(criteria);
		const sorting: Contracts.Search.Sorting = [
			{ direction: "asc", property: "blockHeight" },
			{ direction: "asc", property: "sequence" },
		];
		const models = await this.transactionRepository.findManyByExpression(expression, sorting);
		return this.modelConverter.getTransactionData(models);
	}

	public async *streamByCriteria(
		criteria: Contracts.Search.OrCriteria<Contracts.Shared.TransactionCriteria>,
	): AsyncIterable<Crypto.ITransactionData> {
		const expression = await this.transactionFilter.getExpression(criteria);
		const sorting: Contracts.Search.Sorting = [
			{ direction: "asc", property: "blockHeight" },
			{ direction: "asc", property: "sequence" },
		];
		for await (const model of this.transactionRepository.streamByExpression(expression, sorting)) {
			// @TODO: proper streaming without await
			yield (await this.modelConverter.getTransactionData([model]))[0];
		}
	}

	public async listByCriteria(
		criteria: Contracts.Shared.OrTransactionCriteria,
		sorting: Contracts.Search.Sorting,
		pagination: Contracts.Search.Pagination,
		options?: Contracts.Search.Options,
	): Promise<Contracts.Search.ResultsPage<Crypto.ITransactionData>> {
		const expression = await this.transactionFilter.getExpression(criteria);
		const resultsPage = await this.transactionRepository.listByExpression(expression, sorting, pagination, options);
		const models = resultsPage.results;
		const data = await this.modelConverter.getTransactionData(models);
		return { ...resultsPage, results: data };
	}

	public async findOneByCriteriaJoinBlock(
		criteria: Contracts.Shared.OrTransactionCriteria,
	): Promise<Contracts.Shared.TransactionDataWithBlockData | undefined> {
		const data = await this.findManyByCriteriaJoinBlock(criteria);
		return data[0];
	}

	public async findManyByCriteriaJoinBlock(
		transactionCriteria: Contracts.Shared.OrTransactionCriteria,
	): Promise<Contracts.Shared.TransactionDataWithBlockData[]> {
		const transactionExpression = await this.transactionFilter.getExpression(transactionCriteria);
		const transactionModels = await this.transactionRepository.findManyByExpression(transactionExpression);

		const blockCriteria = { id: transactionModels.map((t) => t.blockId) };
		const blockExpression = await this.blockFilter.getExpression(blockCriteria);
		const blockModels = await this.blockRepository.findManyByExpression(blockExpression);

		return this.modelConverter.getTransactionDataWithBlockData(transactionModels, blockModels);
	}

	public async listByCriteriaJoinBlock(
		transactionCriteria: Contracts.Shared.OrTransactionCriteria,
		sorting: Contracts.Search.Sorting,
		pagination: Contracts.Search.Pagination,
		options?: Contracts.Search.Options,
	): Promise<Contracts.Search.ResultsPage<Contracts.Shared.TransactionDataWithBlockData>> {
		const transactionExpression = await this.transactionFilter.getExpression(transactionCriteria);
		const transactionModelResultsPage = await this.transactionRepository.listByExpression(
			transactionExpression,
			sorting,
			pagination,
			options,
		);
		const transactionModels = transactionModelResultsPage.results;

		const blockCriteria = { id: transactionModels.map((t) => t.blockId) };
		const blockExpression = await this.blockFilter.getExpression(blockCriteria);
		const blockModels = await this.blockRepository.findManyByExpression(blockExpression);

		const transactionDataWithBlockData = await this.modelConverter.getTransactionDataWithBlockData(
			transactionModels,
			blockModels,
		);

		return { ...transactionModelResultsPage, results: transactionDataWithBlockData };
	}
}
