import { IMempoolTransactionRepository, IMempoolTransactionRepositoryExtension, RepositoryDataSource } from "../contracts";
import { MempoolTransaction } from "../models";
import { makeExtendedRepository } from "./repository-extension";

export const makeMempoolTransactionRepository = (dataSource: RepositoryDataSource): IMempoolTransactionRepository =>
	makeExtendedRepository<MempoolTransaction, IMempoolTransactionRepositoryExtension>(MempoolTransaction, dataSource, {
		// Add any extensions here
	});
