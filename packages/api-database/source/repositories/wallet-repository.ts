import { IWalletRepository, RepositoryDataSource } from "../contracts";
import { Wallet } from "../models/wallet";

export const makeWalletRepository = (dataSource: RepositoryDataSource): IWalletRepository =>
	dataSource.getRepository(Wallet).extend({
		// Add any extensions here
	});
