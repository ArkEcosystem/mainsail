import { LegacyColdWalletRepository, LegacyColdWalletRepositoryExtension, RepositoryDataSource } from "../contracts.js";
import { LegacyColdWallet } from "../models/legacy-cold-wallet.js";
import { makeExtendedRepository } from "./repository-extension.js";

export const makeLegacyColdWalletRepository = (dataSource: RepositoryDataSource): LegacyColdWalletRepository =>
	makeExtendedRepository<LegacyColdWallet, LegacyColdWalletRepositoryExtension>(LegacyColdWallet, dataSource, {
		// Add any extensions here
	});
