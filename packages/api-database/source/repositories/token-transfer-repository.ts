import type { RepositoryDataSource, TokenTransferRepository, TokenTransferRepositoryExtension } from "../contracts.js";
import { TokenTransfer } from "../models/index.js";
import { makeExtendedRepository } from "./repository-extension.js";

export const makeTokenTransferRepository = (dataSource: RepositoryDataSource): TokenTransferRepository =>
	makeExtendedRepository<TokenTransfer, TokenTransferRepositoryExtension>(TokenTransfer, dataSource, {
		// Add any extensions here
	});
