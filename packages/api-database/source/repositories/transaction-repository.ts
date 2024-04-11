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
		async findManyByCritera(
			walletRepository: WalletRepository,
			transactionCriteria: Criteria.OrTransactionCriteria,
			sorting: Sorting,
			pagination: Pagination,
			options?: Options,
		): Promise<ResultsPage<Transaction>> {
			const transactionExpression = await TransactionFilter.getExpression(walletRepository, transactionCriteria);
			return this.listByExpression(transactionExpression, sorting, pagination, options);
		},

		async getFeeStatistics(genesisTimestamp: number, days?: number, minFee = 0): Promise<FeeStatistics[]> {
			if (days) {
				const age = Math.max(dayjs().subtract(days, "day").valueOf() - 1, genesisTimestamp);

				return this.createQueryBuilder()
					.select(['type_group AS "typeGroup"', "type"])
					.addSelect("COALESCE(AVG(fee), 0)::int8", "avg")
					.addSelect("COALESCE(MIN(fee), 0)::int8", "min")
					.addSelect("COALESCE(MAX(fee), 0)::int8", "max")
					.addSelect("COALESCE(SUM(fee), 0)::int8", "sum")
					.where("timestamp > :age AND fee >= :minFee", { age, minFee })
					.groupBy("type_group")
					.addGroupBy("type")
					.orderBy("type_group")
					.addOrderBy("type")
					.getRawMany();
			}

			// no days parameter, take the stats from each type for its last 20 txs
			return this.manager.query<FeeStatistics[]>(
				`
				select t_outer.type_group as "typeGroup", t_outer.type as "type", 
					COALESCE(AVG(fee), 0)::int8 AS "avg",
					COALESCE(MIN(fee), 0)::int8 AS "min",
					COALESCE(MIN(fee), 0)::int8 AS "max",
					COALESCE(MAX(fee), 0)::int8 AS "sum"
				from transactions t_outer
				join lateral (
					select 1 from transactions t_inner
					where t_inner.timestamp > $1 and t_inner.type_group = t_outer.type_group and t_inner.type = t_outer.type and fee >= $2
					order by t_inner.timestamp desc
					limit $3
				) t_limit on true
				group by t_outer.type_group, t_outer.type
				order by t_outer.type_group, t_outer.type;
			`,
				[genesisTimestamp, minFee, 20],
			);
		},
	});
