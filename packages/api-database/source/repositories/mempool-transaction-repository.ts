import {
	MempoolTransactionRepository,
	MempoolTransactionRepositoryExtension,
	RepositoryDataSource,
} from "../contracts.js";
import { MempoolTransaction } from "../models/index.js";
import { makeExtendedRepository } from "./repository-extension.js";

export const makeMempoolTransactionRepository = (dataSource: RepositoryDataSource): MempoolTransactionRepository =>
	makeExtendedRepository<MempoolTransaction, MempoolTransactionRepositoryExtension>(MempoolTransaction, dataSource, {
		// Add any extensions here
	});
