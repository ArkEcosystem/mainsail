import { ApiNodeRepository, ApiNodeRepositoryExtension, RepositoryDataSource } from "../contracts.js";
import { ApiNode } from "../models/api-node.js";
import { ApiNodeFilter } from "../search/filters/index.js";
import { Criteria, Options, Pagination, ResultsPage, Sorting } from "../search/index.js";
import { makeExtendedRepository } from "./repository-extension.js";

export const makeApiNodeRepository = (dataSource: RepositoryDataSource): ApiNodeRepository =>
	makeExtendedRepository<ApiNode, ApiNodeRepositoryExtension>(ApiNode, dataSource, {
		async findManyByCriteria(
			peerCriteria: Criteria.OrPeerCriteria,
			sorting: Sorting,
			pagination: Pagination,
			options?: Options,
		): Promise<ResultsPage<ApiNode>> {
			const peerExpression = await ApiNodeFilter.getExpression(peerCriteria);
			return this.listByExpression(peerExpression, sorting, pagination, options);
		},
	});
