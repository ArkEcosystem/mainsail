import type { RepositoryDataSource, TokenRepository, TokenRepositoryExtension } from "../contracts.js";
import { Token } from "../models/index.js";
import { makeExtendedRepository } from "./repository-extension.js";

export const makeTokenRepository = (dataSource: RepositoryDataSource): TokenRepository =>
	makeExtendedRepository<Token, TokenRepositoryExtension>(Token, dataSource, {
		// Add any extensions here
	});
