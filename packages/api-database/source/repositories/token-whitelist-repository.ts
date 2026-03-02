import type {
	RepositoryDataSource,
	TokenWhitelistRepository,
	TokenWhitelistRepositoryExtension,
} from "../contracts.js";
import { TokenWhitelist } from "../models/index.js";
import { makeExtendedRepository } from "./repository-extension.js";

export const makeTokenWhitelistRepository = (dataSource: RepositoryDataSource): TokenWhitelistRepository =>
	makeExtendedRepository<TokenWhitelist, TokenWhitelistRepositoryExtension>(TokenWhitelist, dataSource, {
		// Add any extensions here
	});
