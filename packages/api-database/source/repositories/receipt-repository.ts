import { ReceiptRepository, ReceiptRepositoryExtension, RepositoryDataSource } from "../contracts.js";
import { Receipt } from "../models/index.js";
import { ReceiptFilter } from "../search/filters/receipt-filter.js";
import { Criteria, Options, Pagination, ResultsPage, Sorting } from "../search/index.js";
import { makeExtendedRepository } from "./repository-extension.js";

export const makeReceiptRepository = (dataSource: RepositoryDataSource): ReceiptRepository =>
	makeExtendedRepository<Receipt, ReceiptRepositoryExtension>(Receipt, dataSource, {
		async findManyByCriteria(
			criteria: Criteria.OrReceiptCriteria,
			sorting: Sorting,
			pagination: Pagination,
			options?: Options,
		): Promise<ResultsPage<Receipt>> {
			const peerExpression = await ReceiptFilter.getExpression(criteria);
			return this.listByExpression(peerExpression, sorting, pagination, options);
		},
	});
