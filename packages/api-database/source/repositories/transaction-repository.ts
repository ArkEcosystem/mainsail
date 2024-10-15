import dayjs from "dayjs";

import {
	FeeStatistics,
	RepositoryDataSource,
	TransactionRepository,
	TransactionRepositoryExtension,
	WalletRepository,
} from "../contracts.js";
import { Transaction } from "../models/index.js";
import { TransactionFilter } from "../search/filters/transaction-filter.js";
import { Criteria, Options, Pagination, ResultsPage, Sorting } from "../search/index.js";
import { makeExtendedRepository } from "./repository-extension.js";

export const makeTransactionRepository = (dataSource: RepositoryDataSource): TransactionRepository =>
	makeExtendedRepository<Transaction, TransactionRepositoryExtension>(Transaction, dataSource, {
		async findManyByCriteria(
			walletRepository: WalletRepository,
			transactionCriteria: Criteria.OrTransactionCriteria,
			sorting: Sorting,
			pagination: Pagination,
			options?: Options,
		): Promise<ResultsPage<Transaction>> {
			const transactionExpression = await TransactionFilter.getExpression(walletRepository, transactionCriteria);
			return this.listByExpression(transactionExpression, sorting, pagination, options);
		},

		async getFeeStatistics(
			genesisTimestamp: number,
			days?: number,
			minFee = 0,
		): Promise<FeeStatistics | undefined> {
			if (days) {
				const age = Math.max(dayjs().subtract(days, "day").valueOf() - 1, genesisTimestamp);

				return this.createQueryBuilder()
					.select("TRUNC(COALESCE(AVG(fee), 0)::numeric", "avg")
					.addSelect("TRUNC(COALESCE(MIN(fee), 0)::numeric", "min")
					.addSelect("TRUNC(COALESCE(MAX(fee), 0)::numeric", "max")
					.addSelect("TRUNC(COALESCE(SUM(fee), 0)::numeric", "sum")
					.where("timestamp > :age AND fee >= :minFee", { age, minFee })
					.getRawOne();
			}

			// no days parameter, take the stats from each type for its last 20 txs
			return this.manager.query<FeeStatistics>(
				`
				select 
					TRUNC(COALESCE(AVG(fee), 0)::numeric) AS "avg",
					TRUNC(COALESCE(MIN(fee), 0)::numeric) AS "min",
					TRUNC(COALESCE(MIN(fee), 0)::numeric) AS "max",
					TRUNC(COALESCE(MAX(fee), 0)::numeric) AS "sum"
				from transactions t_outer
				join lateral (
					select 1 from transactions t_inner
					where t_inner.timestamp > $1 and fee >= $2
					order by t_inner.timestamp desc
					limit $3
				) t_limit on true;
			`,
				[genesisTimestamp, minFee, 20],
			);
		},
	});
