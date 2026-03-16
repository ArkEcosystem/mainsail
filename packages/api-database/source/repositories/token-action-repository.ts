import type { RepositoryDataSource, TokenActionRepository, TokenActionRepositoryExtension } from "../contracts.js";
import { TokenAction } from "../models/index.js";
import { makeExtendedRepository } from "./repository-extension.js";

export const makeTokenActionRepository = (dataSource: RepositoryDataSource): TokenActionRepository =>
	makeExtendedRepository<TokenAction, TokenActionRepositoryExtension>(TokenAction, dataSource, {
		// Add any extensions here
	});
