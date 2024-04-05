import { EntityTarget, ObjectLiteral, Repository, SelectQueryBuilder } from "typeorm";

import { RepositoryDataSource } from "../contracts.js";
import { Expression } from "../search/expressions.js";
import { Expressions, Options, Pagination, QueryHelper, ResultsPage, Sorting } from "../search/index.js";

export interface RepositoryExtension<TEntity extends ObjectLiteral> {
	queryHelper: QueryHelper<TEntity>;

	addWhere(queryBuilder: SelectQueryBuilder<TEntity>, expression: Expressions.Expression<TEntity>): void;

	addOrderBy(queryBuilder: SelectQueryBuilder<TEntity>, sorting: Sorting): void;

	addSkipOffset(queryBuilder: SelectQueryBuilder<TEntity>, pagination: Pagination): void;

	findManyByExpression(expression: Expressions.Expression<TEntity>, sorting?: Sorting): Promise<TEntity[]>;

	listByExpression(
		expression: Expression<TEntity>,
		sorting: Sorting,
		pagination: Pagination,
		options?: Options,
	): Promise<ResultsPage<TEntity>>;
}

export type ExtendedRepository<TEntity extends ObjectLiteral> = RepositoryExtension<TEntity> & Repository<TEntity>;
export type ThisRepositoryExtension<TEntity extends ObjectLiteral> = ThisType<ExtendedRepository<TEntity>>;

export const makeExtendedRepository = <TEntity extends ObjectLiteral, CustomRepository>(
	entity: EntityTarget<TEntity>,
	dataSource: RepositoryDataSource,
	extend: CustomRepository & ThisType<ExtendedRepository<TEntity> & CustomRepository>,
): ExtendedRepository<TEntity> & CustomRepository =>
	dataSource.getRepository(entity).extend<RepositoryExtension<TEntity> & CustomRepository>({
		...getRepositoryExtension(),
		...extend,
	});

const getRepositoryExtension = <TEntity extends ObjectLiteral>(): RepositoryExtension<TEntity> &
	ThisRepositoryExtension<TEntity> => ({
	addOrderBy(queryBuilder: SelectQueryBuilder<TEntity>, sorting: Sorting): void {
		if (sorting.length > 0) {
			const column = this.queryHelper.getColumnName(
				this.metadata,
				sorting[0].property,
				sorting[0].jsonFieldAccessor,
			);
			queryBuilder.orderBy(column, sorting[0].direction === "desc" ? "DESC" : "ASC");

			for (const item of sorting.slice(1)) {
				const column = this.queryHelper.getColumnName(this.metadata, item.property, item.jsonFieldAccessor);
				queryBuilder.addOrderBy(column, item.direction === "desc" ? "DESC" : "ASC");
			}
		}
	},

	addSkipOffset(queryBuilder: SelectQueryBuilder<TEntity>, pagination: Pagination): void {
		queryBuilder.skip(pagination.offset).take(pagination.limit);
	},

	addWhere(queryBuilder: SelectQueryBuilder<TEntity>, expression: Expressions.Expression<TEntity>): void {
		const sqlExpression = this.queryHelper.getWhereExpressionSql(this.metadata, expression);
		queryBuilder.where(sqlExpression.query, sqlExpression.parameters);
	},

	async findManyByExpression(expression: Expressions.Expression<TEntity>, sorting: Sorting = []): Promise<TEntity[]> {
		const queryBuilder: SelectQueryBuilder<TEntity> = this.createQueryBuilder().select();

		this.addWhere(queryBuilder, expression);
		this.addOrderBy(queryBuilder, sorting);

		return queryBuilder.getMany();
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
				const resultsQueryBuilder = this.createQueryBuilder().setQueryRunner(queryRunner).select();
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
			} catch (error) {
				await queryRunner.rollbackTransaction();
				throw error;
			}
		} finally {
			await queryRunner.release();
		}
	},

	queryHelper: new QueryHelper(),
});
