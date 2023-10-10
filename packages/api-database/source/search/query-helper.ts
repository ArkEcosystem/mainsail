import { EntityMetadata } from "typeorm";

import { Expression, JsonFieldAccessor } from "./expressions";

export type SqlExpression = {
	query: string;
	parameters: Record<string, any>;
};

export class QueryHelper<TEntity> {
	private paramNo = 1;

	public getColumnName(
		metadata: EntityMetadata,
		property: keyof TEntity,
		jsonFieldAccessor?: JsonFieldAccessor,
	): string {
		const column = metadata.columns.find((c) => c.propertyName === property);
		if (!column) {
			throw new Error(`Can't find ${String(property)} column`);
		}

		if (jsonFieldAccessor) {
			if (column.type !== "jsonb") {
				throw new Error(`Can't apply json field accessor to ${String(property)} column`);
			}

			return `${column.databaseName}${jsonFieldAccessor.operator}'${jsonFieldAccessor.fieldName}'`;
		}

		return column.databaseName;
	}

	public getWhereExpressionSql(metadata: EntityMetadata, expression: Expression<TEntity>): SqlExpression {
		switch (expression.op) {
			case "true": {
				return { parameters: {}, query: "TRUE" };
			}
			case "false": {
				return { parameters: {}, query: "FALSE" };
			}
			case "equal": {
				const column = this.getColumnName(metadata, expression.property, expression.jsonFieldAccessor);
				const parameter = `p${this.paramNo++}`;
				const query = `${column} = :${parameter}`;
				const parameters = { [parameter]: expression.value };
				return { parameters, query };
			}
			case "between": {
				const column = this.getColumnName(metadata, expression.property, expression.jsonFieldAccessor);
				const parameterFrom = `p${this.paramNo++}`;
				const parameterTo = `p${this.paramNo++}`;
				const query = `${column} BETWEEN :${parameterFrom} AND :${parameterTo}`;
				const parameters = { [parameterFrom]: expression.from, [parameterTo]: expression.to };
				return { parameters, query };
			}
			case "greaterThanEqual": {
				const column = this.getColumnName(metadata, expression.property, expression.jsonFieldAccessor);
				const parameter = `p${this.paramNo++}`;
				const query = `${column} >= :${parameter}`;
				const parameters = { [parameter]: expression.value };
				return { parameters, query };
			}
			case "lessThanEqual": {
				const column = this.getColumnName(metadata, expression.property, expression.jsonFieldAccessor);
				const parameter = `p${this.paramNo++}`;
				const query = `${column} <= :${parameter}`;
				const parameters = { [parameter]: expression.value };
				return { parameters, query };
			}
			case "like": {
				const column = this.getColumnName(metadata, expression.property, expression.jsonFieldAccessor);
				const parameter = `p${this.paramNo++}`;
				const query = `${column} LIKE :${parameter}`;
				const parameters = { [parameter]: expression.pattern };
				return { parameters, query };
			}
			case "contains": {
				const column = this.getColumnName(metadata, expression.property, expression.jsonFieldAccessor);
				const parameter = `p${this.paramNo++}`;
				const query = `${column} @> :${parameter}`;
				const parameters = { [parameter]: expression.value };
				return { parameters, query };
			}
			case "and": {
				const built = expression.expressions.map((e) => this.getWhereExpressionSql(metadata, e));
				const query = `(${built.map((b) => b.query).join(" AND ")})`;
				const parameters = built.reduce((accumulator, b) => Object.assign({}, accumulator, b.parameters), {});
				return { parameters, query };
			}
			case "or": {
				const built = expression.expressions.map((e) => this.getWhereExpressionSql(metadata, e));
				const query = `(${built.map((b) => b.query).join(" OR ")})`;
				const parameters = built.reduce((accumulator, b) => Object.assign({}, accumulator, b.parameters), {});
				return { parameters, query };
			}
			default:
				throw new Error(`Unexpected expression`);
		}
	}
}
