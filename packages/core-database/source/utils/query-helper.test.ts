import { describe } from "../../../core-test-framework";
import { QueryHelper } from "./query-helper";

type UserEntity = {
	id: number;
	fullName: string;
	age: number;
	data: Record<string, any>;
};

const userMetadata = {
	columns: [
		{ databaseName: "id", propertyName: "id" },
		{ databaseName: "full_name", propertyName: "fullName" },
		{ databaseName: "age", propertyName: "age" },
		{ databaseName: "data", propertyName: "data" },
	],
};

describe("QueryHelper.getColumnName", ({ assert, it }) => {
	it("should throw when column name can't be found", () => {
		const queryHelper = new QueryHelper<UserEntity>();

		assert.rejects(() => queryHelper.getColumnName(userMetadata as any, "unknown" as any));
	});

	it("should return column name", () => {
		const queryHelper = new QueryHelper<UserEntity>();
		const columnName = queryHelper.getColumnName(userMetadata as any, "fullName");

		assert.equal(columnName, "full_name");
	});
});

describe("QueryHelper.getWhereExpressionSql", ({ assert, it }) => {
	it("should throw when unexpected expression is passed", () => {
		const queryHelper = new QueryHelper<UserEntity>();

		assert.rejects(() => queryHelper.getWhereExpressionSql(userMetadata as any, { op: "nonsense" } as any));
	});

	it("should convert TrueExpression to 'TRUE'", () => {
		const queryHelper = new QueryHelper<UserEntity>();
		const sqlExpression = queryHelper.getWhereExpressionSql(userMetadata as any, { op: "true" });

		assert.equal(sqlExpression.query, "TRUE");
		assert.equal(sqlExpression.parameters, {});
	});

	it("should convert FalseExpression to 'FALSE'", () => {
		const queryHelper = new QueryHelper<UserEntity>();
		const sqlExpression = queryHelper.getWhereExpressionSql(userMetadata as any, { op: "false" });

		assert.equal(sqlExpression.query, "FALSE");
		assert.equal(sqlExpression.parameters, {});
	});

	it("should convert EqualExpression to 'column = :p1'", () => {
		const queryHelper = new QueryHelper<UserEntity>();
		const sqlExpression = queryHelper.getWhereExpressionSql(userMetadata as any, {
			op: "equal",
			property: "id",
			value: 5,
		});

		assert.equal(sqlExpression.query, "id = :p1");
		assert.equal(sqlExpression.parameters, { p1: 5 });
	});

	it("should convert BetweenExpression to 'column BETWEEN :p1 AND :p2'", () => {
		const queryHelper = new QueryHelper<UserEntity>();
		const sqlExpression = queryHelper.getWhereExpressionSql(userMetadata as any, {
			from: 26,
			op: "between",
			property: "age",
			to: 35,
		});

		assert.equal(sqlExpression.query, "age BETWEEN :p1 AND :p2");
		assert.equal(sqlExpression.parameters, { p1: 26, p2: 35 });
	});

	it("should convert GreaterThanEqualExpression to 'column >= :p1'", () => {
		const queryHelper = new QueryHelper<UserEntity>();
		const sqlExpression = queryHelper.getWhereExpressionSql(userMetadata as any, {
			op: "greaterThanEqual",
			property: "age",
			value: 26,
		});

		assert.equal(sqlExpression.query, "age >= :p1");
		assert.equal(sqlExpression.parameters, { p1: 26 });
	});

	it("should convert LessThanEqualExpression to 'column <= :p1'", () => {
		const queryHelper = new QueryHelper<UserEntity>();
		const sqlExpression = queryHelper.getWhereExpressionSql(userMetadata as any, {
			op: "lessThanEqual",
			property: "age",
			value: 35,
		});

		assert.equal(sqlExpression.query, "age <= :p1");
		assert.equal(sqlExpression.parameters, { p1: 35 });
	});

	it("should convert LikeExpression to 'column LIKE :p1'", () => {
		const queryHelper = new QueryHelper<UserEntity>();
		const sqlExpression = queryHelper.getWhereExpressionSql(userMetadata as any, {
			op: "like",
			pattern: "%Dmitry%",
			property: "fullName",
		});

		assert.equal(sqlExpression.query, "full_name LIKE :p1");
		assert.equal(sqlExpression.parameters, { p1: "%Dmitry%" });
	});

	it("should convert ContainsExpression to 'column @> :p1'", () => {
		const queryHelper = new QueryHelper<UserEntity>();
		const sqlExpression = queryHelper.getWhereExpressionSql(userMetadata as any, {
			op: "contains",
			property: "data",
			value: {
				creditCard: { number: "5555 5555 5555 5555" },
			},
		});

		assert.equal(sqlExpression.query, "data @> :p1");
		assert.equal(sqlExpression.parameters, {
			p1: {
				creditCard: { number: "5555 5555 5555 5555" },
			},
		});
	});

	it("should convert AndExpression to (expression1 AND expression2)", () => {
		const queryHelper = new QueryHelper<UserEntity>();
		const sqlExpression = queryHelper.getWhereExpressionSql(userMetadata as any, {
			expressions: [
				{ op: "like", pattern: "%Dmitry%", property: "fullName" },
				{ op: "greaterThanEqual", property: "age", value: 35 },
			],
			op: "and",
		});

		assert.equal(sqlExpression.query, "(full_name LIKE :p1 AND age >= :p2)");
		assert.equal(sqlExpression.parameters, { p1: "%Dmitry%", p2: 35 });
	});

	it("should convert OrExpression to (expression1 OR expression2)", () => {
		const queryHelper = new QueryHelper<UserEntity>();
		const sqlExpression = queryHelper.getWhereExpressionSql(userMetadata as any, {
			expressions: [
				{ op: "like", pattern: "%Dmitry%", property: "fullName" },
				{ op: "greaterThanEqual", property: "age", value: 35 },
			],
			op: "or",
		});

		assert.equal(sqlExpression.query, "(full_name LIKE :p1 OR age >= :p2)");
		assert.equal(sqlExpression.parameters, { p1: "%Dmitry%", p2: 35 });
	});
});
