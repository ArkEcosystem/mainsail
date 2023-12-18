import {
	MempoolTransactionRepository,
	MempoolTransactionRepositoryExtension,
	RepositoryDataSource,
} from "../contracts";
import { MempoolTransaction } from "../models";
import { makeExtendedRepository } from "./repository-extension";

export const makeMempoolTransactionRepository = (dataSource: RepositoryDataSource): MempoolTransactionRepository =>
	makeExtendedRepository<MempoolTransaction, MempoolTransactionRepositoryExtension>(MempoolTransaction, dataSource, {
		// Add any extensions here
	});
