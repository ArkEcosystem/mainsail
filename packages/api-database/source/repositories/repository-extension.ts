import { EntityTarget, ObjectLiteral, Repository, SelectQueryBuilder } from "typeorm";

import { RepositoryDataSource } from "../contracts";
import { Expressions, QueryHelper, Sorting } from "../search";

export interface RepositoryExtension<TEntity extends ObjectLiteral> {
	queryHelper: QueryHelper<TEntity>;

	addWhere(queryBuilder: SelectQueryBuilder<TEntity>, expression: Expressions.Expression<TEntity>): void;

	addOrderBy(queryBuilder: SelectQueryBuilder<TEntity>, sorting: Sorting): void;

	findManyByExpression(expression: Expressions.Expression<TEntity>, sorting?: Sorting): Promise<TEntity[]>;
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
			const column = this.queryHelper.getColumnName(this.metadata, sorting[0].property);
			queryBuilder.orderBy(column, sorting[0].direction === "desc" ? "DESC" : "ASC");

			for (const item of sorting.slice(1)) {
				const column = this.queryHelper.getColumnName(this.metadata, item.property);
				queryBuilder.addOrderBy(column, item.direction === "desc" ? "DESC" : "ASC");
			}
		}
	},

	addWhere(queryBuilder: SelectQueryBuilder<TEntity>, expression: Expressions.Expression<TEntity>): void {
		const sqlExpression = this.queryHelper.getWhereExpressionSql(this.metadata, expression);
		queryBuilder.where(sqlExpression.query, sqlExpression.parameters);
	},

	findManyByExpression(expression: Expressions.Expression<TEntity>, sorting: Sorting = []): Promise<TEntity[]> {
		const queryBuilder: SelectQueryBuilder<TEntity> = this.createQueryBuilder().select();

		this.addWhere(queryBuilder, expression);
		this.addOrderBy(queryBuilder, sorting);

		return queryBuilder.getMany();
	},

	queryHelper: new QueryHelper(),

	// private addSkipOffset(queryBuilder: SelectQueryBuilder<TEntity>, pagination: Contracts.Search.Pagination): void {
	// 	queryBuilder.skip(pagination.offset).take(pagination.limit);
	// }
});
