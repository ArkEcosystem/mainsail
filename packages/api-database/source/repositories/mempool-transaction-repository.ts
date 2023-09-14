import { IMempoolTransactionRepository, RepositoryDataSource } from "../contracts";
import { MempoolTransaction } from "../models";

export const makeMempoolTransactionRepository = (dataSource: RepositoryDataSource): IMempoolTransactionRepository =>
	dataSource.getRepository(MempoolTransaction).extend({
		// Add any extensions here
	});
