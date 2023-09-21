import { IWalletRepository, IWalletRepositoryExtension, RepositoryDataSource } from "../contracts";
import { Wallet } from "../models/wallet";
import { makeExtendedRepository } from "./repository-extension";

export const makeWalletRepository = (dataSource: RepositoryDataSource): IWalletRepository =>
	makeExtendedRepository<Wallet, IWalletRepositoryExtension>(Wallet, dataSource, {
		// Add any extensions here
	});
