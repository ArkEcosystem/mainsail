import type { EntityTarget, ObjectLiteral, SelectQueryBuilder } from "typeorm";

import { ensureError } from "@mainsail/utils";

import type {
	ExtendedRepository,
	RepositoryDataSource,
	RepositoryExtension,
	ThisRepositoryExtension,
} from "../contracts.js";
import type { Expression } from "../search/types/expressions.js";
import type { Expressions, Options, Pagination, ResultsPage, Sorting } from "../search/types/index.js";

import { QueryHelper } from "../search/index.js";

const getRepositoryExtension = <TEntity extends ObjectLiteral>(): RepositoryExtension<TEntity> &
	ThisRepositoryExtension<TEntity> => ({
	addOrderBy(queryBuilder: SelectQueryBuilder<TEntity>, sorting: Sorting): void {
		const sorted = new Set<string>();
		for (const item of sorting) {
			const column = this.queryHelper.getColumnName(this.metadata, item.property, item.jsonFieldAccessor);

			// A column sorted twice keeps its first direction, where TypeORM would take the last one.
			if (sorted.has(column.name)) {
				continue;
			}

			const direction = item.direction === "desc" ? "DESC" : "ASC";
			const nulls = column.isNullable ? "NULLS LAST" : undefined;
			if (sorted.size === 0) {
				queryBuilder.orderBy(column.name, direction, nulls);
			} else {
				queryBuilder.addOrderBy(column.name, direction, nulls);
			}

			sorted.add(column.name);
		}
	},

	addSkipOffset(queryBuilder: SelectQueryBuilder<TEntity>, pagination: Pagination): void {
		queryBuilder.skip(pagination.offset).take(pagination.limit);
	},

	addWhere(queryBuilder: SelectQueryBuilder<TEntity>, expression: Expressions.Expression<TEntity>): void {
		const sqlExpression = this.queryHelper.getWhereExpressionSql(this.metadata, expression);
		queryBuilder.where(sqlExpression.query, sqlExpression.parameters);
	},

	async listByExpression(
		expression: Expression<TEntity>,
		sorting: Sorting,
		pagination: Pagination,
		options?: Options,
	): Promise<ResultsPage<TEntity>> {
		const queryRunner = this.manager.connection.createQueryRunner("slave");

		try {
			await queryRunner.startTransaction("REPEATABLE READ");

			try {
				const resultsQueryBuilder = this.createQueryBuilder().setQueryRunner(queryRunner);

				if (options?.selection) {
					resultsQueryBuilder.select([]);

					for (const select of options.selection) {
						resultsQueryBuilder.addSelect(select);
					}
				}

				this.addWhere(resultsQueryBuilder, expression);
				this.addOrderBy(resultsQueryBuilder, sorting);
				this.addSkipOffset(resultsQueryBuilder, pagination);

				const results = await resultsQueryBuilder.getMany();

				if (options?.estimateTotalCount === false) {
					// typeorm@0.2.25 generates slow COUNT(DISTINCT primary_key_column) for getCount or getManyAndCount

					const totalCountQueryBuilder = this.createQueryBuilder()
						.setQueryRunner(queryRunner)
						.select("COUNT(*) AS total_count");

					this.addWhere(totalCountQueryBuilder, expression);

					const totalCountRow = await totalCountQueryBuilder.getRawOne();
					const totalCount = Number.parseFloat(totalCountRow["total_count"]);

					await queryRunner.commitTransaction();

					return { meta: { totalCountIsEstimate: false }, results, totalCount };
				}

				let totalCountEstimated = 0;
				const [resultsSql, resultsParameters] = resultsQueryBuilder.getQueryAndParameters();
				const resultsExplainedRows = await queryRunner.query(`EXPLAIN ${resultsSql}`, resultsParameters);
				for (const resultsExplainedRow of resultsExplainedRows) {
					const match = resultsExplainedRow["QUERY PLAN"].match(/rows=(\d+)/);
					if (match) {
						totalCountEstimated = Number.parseFloat(match[1]);
					}
				}

				const totalCount = Math.max(totalCountEstimated, results.length);

				await queryRunner.commitTransaction();

				return { meta: { totalCountIsEstimate: true }, results, totalCount };
			} catch (rawError) {
				const error = ensureError(rawError);
				await queryRunner.rollbackTransaction();
				throw error;
			}
		} finally {
			await queryRunner.release();
		}
	},

	queryHelper: new QueryHelper(),
});

export const makeExtendedRepository = <TEntity extends ObjectLiteral, CustomRepository>(
	entity: EntityTarget<TEntity>,
	dataSource: RepositoryDataSource,
	extend: CustomRepository & ThisType<ExtendedRepository<TEntity> & CustomRepository>,
): ExtendedRepository<TEntity> & CustomRepository =>
	dataSource.getRepository(entity).extend<RepositoryExtension<TEntity> & CustomRepository>({
		...getRepositoryExtension(),
		...extend,
	});

// Breaks ties on a unique property, so that pages neither overlap nor skip rows. It follows the direction of the last
// sort key, so that one index on both serves either direction.
export const breakTies = (sorting: Sorting, property: string): Sorting =>
	sorting.some((item) => item.property === property)
		? sorting
		: [...sorting, { direction: sorting.at(-1)?.direction ?? "asc", property }];
