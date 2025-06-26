import { EntityMetadata } from "typeorm";

import { Expression, JsonFieldAccessor } from "./types/expressions.js";

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

			// 'validatorBlock.number' => ['validatorBlock', 'number']
			const pathFields = jsonFieldAccessor.fieldName.split(".");

			// ['validatorBlock', 'number'] => ['validatorBlock']
			const lastField = pathFields.splice(-1, 1);

			// ['validatorBlock', 'nested', 'attribute'] => 'validatorBlock'->'nested'->'attribute'
			const fieldPath = pathFields.map((f) => `'${f}'`).join("->");

			// 'validatorBlock'->'last' => 'validatorBlock'->'last'->>'number'
			let fullFieldPath = `${fieldPath}${jsonFieldAccessor.operator}'${lastField}'`;
			if (fieldPath.length > 0) {
				// 'validatorBlock'->'last'->>'number' => column->'validatorBlock'->'last'->>'number'
				fullFieldPath = `${column.databaseName}->${fullFieldPath}`;
			} else {
				// ->>'number' => column->>'number'
				fullFieldPath = `${column.databaseName}${fullFieldPath}`;
			}

			if (jsonFieldAccessor.cast) {
				// (column->'validatorBlock'->'last'->>'number')::bigint
				fullFieldPath = `(${fullFieldPath})::${jsonFieldAccessor.cast}`;
			}

			return fullFieldPath;
		}

		// Escape reserved keyword
		if (["to", "from"].includes(column.databaseName)) {
			return `"${column.databaseName}"`;
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
			case "notEqual": {
				const column = this.getColumnName(metadata, expression.property, expression.jsonFieldAccessor);
				const parameter = `p${this.paramNo++}`;
				const query = `${column} <> :${parameter}`;
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
			case "jsonbAttributeExists": {
				const column = this.getColumnName(metadata, expression.property);
				const parameter = `p${this.paramNo++}`;
				const query = `${column} ? :${parameter}`;
				const parameters = { [parameter]: expression.attribute };
				return { parameters, query };
			}
			case "functionSig": {
				const column = this.getColumnName(metadata, expression.property);
				const parameter = `p${this.paramNo++}`;
				const query = `SUBSTRING(${column} FROM 1 FOR 4) = :${parameter}`;
				const parameters = { [parameter]: expression.value };
				return { parameters, query };
			}
			default: {
				throw new Error(`Unexpected expression`);
			}
		}
	}
}
