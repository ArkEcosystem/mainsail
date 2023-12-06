import { IApiNodeRepository, IApiNodeRepositoryExtension, RepositoryDataSource } from "../contracts";
import { ApiNode } from "../models/api-node";
import { Criteria, Options, Pagination, ResultsPage, Sorting } from "../search";
import { ApiNodeFilter } from "../search/filters";
import { makeExtendedRepository } from "./repository-extension";

export const makeApiNodeRepository = (dataSource: RepositoryDataSource): IApiNodeRepository =>
    makeExtendedRepository<ApiNode, IApiNodeRepositoryExtension>(ApiNode, dataSource, {
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
