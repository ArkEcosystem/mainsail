import dayjs from "dayjs";

import {
	FeeStatistics,
	ITransactionRepository,
	ITransactionRepositoryExtension,
	IWalletRepository,
	RepositoryDataSource,
} from "../contracts";
import { Transaction } from "../models";
import { Criteria, Options, Pagination, ResultsPage, Sorting } from "../search";
import { TransactionFilter } from "../search/filters/transaction-filter";
import { makeExtendedRepository } from "./repository-extension";

export const makeTransactionRepository = (dataSource: RepositoryDataSource): ITransactionRepository =>
	makeExtendedRepository<Transaction, ITransactionRepositoryExtension>(Transaction, dataSource, {
		async findManyByCritera(
			walletRepository: IWalletRepository,
			transactionCriteria: Criteria.OrTransactionCriteria,
			sorting: Sorting,
			pagination: Pagination,
			options?: Options,
		): Promise<ResultsPage<Transaction>> {
			const transactionExpression = await TransactionFilter.getExpression(walletRepository, transactionCriteria);
			return this.listByExpression(transactionExpression, sorting, pagination, options);
		},

		async getFeeStatistics(days?: number, minFee?: number): Promise<FeeStatistics[]> {
			minFee = minFee || 0;

			if (days) {
				const age = dayjs().subtract(days, "day").valueOf();

				return this.createQueryBuilder()
					.select(['type_group AS "typeGroup"', "type"])
					.addSelect("COALESCE(AVG(fee), 0)::int8", "avg")
					.addSelect("COALESCE(MIN(fee), 0)::int8", "min")
					.addSelect("COALESCE(MAX(fee), 0)::int8", "max")
					.addSelect("COALESCE(SUM(fee), 0)::int8", "sum")
					.where("timestamp >= :age AND fee >= :minFee", { age, minFee })
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
					where t_inner.type_group = t_outer.type_group and t_inner.type = t_outer.type and fee >= $1
					order by t_inner.timestamp desc
					limit $2
				) t_limit on true
				group by t_outer.type_group, t_outer.type
				order by t_outer.type_group, t_outer.type;
			`,
				[minFee, 20],
			);
		},
	});
