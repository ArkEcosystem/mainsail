import type { RepositoryDataSource, TokenHolderRepository, TokenHolderRepositoryExtension } from "../contracts.js";
import { TokenHolder } from "../models/index.js";
import { makeExtendedRepository } from "./repository-extension.js";

export const makeTokenHolderRepository = (dataSource: RepositoryDataSource): TokenHolderRepository =>
	makeExtendedRepository<TokenHolder, TokenHolderRepositoryExtension>(TokenHolder, dataSource, {
		// Add any extensions here
	});
