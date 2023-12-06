import { IApiNodeRepository, IApiNodeRepositoryExtension, RepositoryDataSource } from "../contracts";
import { ApiNode } from "../models/api-node";
import { makeExtendedRepository } from "./repository-extension";

export const makeApiNodeRepository = (dataSource: RepositoryDataSource): IApiNodeRepository =>
    makeExtendedRepository<ApiNode, IApiNodeRepositoryExtension>(ApiNode, dataSource, {});
