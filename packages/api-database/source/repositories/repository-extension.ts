import type { EntityTarget, ObjectLiteral, SelectQueryBuilder } from "typeorm";

import { ensureError } from "@mainsail/utils";

import type {
	ExtendedRepository,
	RepositoryDataSource,
	RepositoryExtension,
	ThisRepositoryExtension,
} from "../contracts.js";
import type { Expression } from "../search/types/expressions.js";
import type { Expressions, Options, Pagination, ResultsPage, SortFragment, Sorting } from "../search/types/index.js";

import { groupEqualities, QueryHelper } from "../search/index.js";

const getRepositoryExtension = <TEntity extends ObjectLiteral>(): RepositoryExtension<TEntity> &
	ThisRepositoryExtension<TEntity> => ({
	addOrderBy(queryBuilder: SelectQueryBuilder<TEntity>, sorting: Sorting): void {
		const sorted = new Set<string>();
		for (const item of sorting) {
			const column = this.queryHelper.getColumnName(this.metadata, item.property, item.jsonFieldAccessor);

			// TypeORM would keep the last direction of a column sorted twice
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
		const sqlExpression = this.queryHelper.getWhereExpressionSql(this.metadata, groupEqualities(expression));
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

				// a page short of the limit, or an empty first page, is the last one
				if (results.length < pagination.limit && (results.length > 0 || pagination.offset === 0)) {
					await queryRunner.commitTransaction();

					return {
						meta: { totalCountIsEstimate: false },
						results,
						totalCount: pagination.offset + results.length,
					};
				}

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

				const [resultsSql, resultsParameters] = resultsQueryBuilder.getQueryAndParameters();
				const [
					{
						"QUERY PLAN": [{ Plan: plan }],
					},
				] = await queryRunner.query(`EXPLAIN (FORMAT JSON) ${resultsSql}`, resultsParameters);

				// nodes below the one under the LIMIT may estimate the rows of a single parallel worker only
				const estimated =
					plan["Node Type"] === "Limit"
						? plan.Plans.find((child) => child["Parent Relationship"] === "Outer")
						: plan;

				// a full page may be followed by more rows, an empty page past the end by none
				const totalCount: number =
					results.length > 0
						? Math.max(estimated["Plan Rows"], pagination.offset + results.length + 1)
						: Math.min(estimated["Plan Rows"], pagination.offset);

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

// in the direction of the last distinct sort key, so that one index serves both directions
export const breakTies = (sorting: Sorting, property: string, direction?: SortFragment["direction"]): Sorting => {
	const keys = sorting.map((item) => `${item.property}.${item.jsonFieldAccessor?.fieldName ?? ""}`);
	const last = sorting.findLast((_, index) => keys.indexOf(keys[index]) === index);

	return [...sorting, { direction: direction ?? last?.direction ?? "asc", property }];
};
