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
import { Criteria, Options, Pagination, ResultsPage, Sorting } from "../search/types/index.js";
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
			minGasPrice = 0,
		): Promise<FeeStatistics | undefined> {
			if (days) {
				const age = Math.max(dayjs().subtract(days, "day").valueOf() - 1, genesisTimestamp);

				return this.createQueryBuilder()
					.select("TRUNC(COALESCE(AVG(gas_price), 0)::numeric)", "avg")
					.addSelect("TRUNC(COALESCE(MIN(gas_price), 0)::numeric)", "min")
					.addSelect("TRUNC(COALESCE(MAX(gas_price), 0)::numeric)", "max")
					.addSelect("TRUNC(COALESCE(SUM(gas_price), 0)::numeric)", "sum")
					.where("timestamp > :age AND gas_price >= :minGasPrice", { age, minGasPrice })
					.getRawOne();
			}

			// no days parameter, take the stats from each type for its last 20 txs
			const result = await this.manager.query<FeeStatistics>(
				`
				select
					TRUNC(COALESCE(AVG(txs.gas_price), 0)::numeric) AS "avg",
					TRUNC(COALESCE(MIN(txs.gas_price), 0)::numeric) AS "min",
					TRUNC(COALESCE(MAX(txs.gas_price), 0)::numeric) AS "max",
					TRUNC(COALESCE(SUM(txs.gas_price), 0)::numeric) AS "sum"
				from (
					select gas_price from transactions
					where timestamp > $1 and gas_price >= $2
					order by timestamp desc
					limit $3
				) txs;
			`,
				[genesisTimestamp, minGasPrice, 20],
			);

			return result?.[0] ?? undefined;
		},
	});
