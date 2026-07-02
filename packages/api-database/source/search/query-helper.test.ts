import { describe } from "@mainsail/test-runner";

import { QueryHelper } from "./query-helper";

const makeMetadata = (columns: any[]) => ({ columns }) as any;

describe<{
	helper: QueryHelper<any>;
	metadata: any;
}>("QueryHelper", ({ it, beforeEach, assert }) => {
	beforeEach((context) => {
		context.helper = new QueryHelper();
		context.metadata = makeMetadata([
			{ databaseName: "id", isNullable: false, propertyName: "id", type: "bigint" },
			{ databaseName: "amount", isNullable: true, propertyName: "amount", type: "bigint" },
			{ databaseName: "data", isNullable: true, propertyName: "data", type: "jsonb" },
			{ databaseName: "from", isNullable: false, propertyName: "from", type: "varchar" },
			{ databaseName: "to", isNullable: true, propertyName: "to", type: "varchar" },
		]);
	});

	// --- getColumnName ---

	it("getColumnName returns databaseName and isNullable for a found column", ({ helper, metadata }) => {
		assert.equal(helper.getColumnName(metadata, "id"), { isNullable: false, name: "id" });
		assert.equal(helper.getColumnName(metadata, "amount"), { isNullable: true, name: "amount" });
	});

	it("getColumnName throws when column missing", ({ helper, metadata }) => {
		assert.throws(() => helper.getColumnName(metadata, "missing"), "Can't find missing column");
	});

	it("getColumnName double-quotes reserved names to/from and propagates isNullable", ({ helper, metadata }) => {
		assert.equal(helper.getColumnName(metadata, "from"), { isNullable: false, name: `"from"` });
		assert.equal(helper.getColumnName(metadata, "to"), { isNullable: true, name: `"to"` });
	});

	it("getColumnName builds a single-field json accessor on jsonb column", ({ helper, metadata }) => {
		assert.equal(helper.getColumnName(metadata, "data", { fieldName: "number", operator: "->>" }), {
			isNullable: true,
			name: `data->>'number'`,
		});
	});

	it("getColumnName builds a nested-path json accessor with cast on jsonb column", ({ helper, metadata }) => {
		assert.equal(
			helper.getColumnName(metadata, "data", {
				cast: "bigint",
				fieldName: "validatorBlock.nested.number",
				operator: "->>",
			}),
			{ isNullable: true, name: `(data->'validatorBlock'->'nested'->>'number')::bigint` },
		);
	});

	it("getColumnName json accessor is always nullable regardless of column isNullable", ({ helper }) => {
		const metadata = makeMetadata([
			{ databaseName: "data", isNullable: false, propertyName: "data", type: "jsonb" },
		]);
		assert.true(helper.getColumnName(metadata, "data", { fieldName: "x", operator: "->>" }).isNullable);
	});

	it("getColumnName throws when json accessor used on non-jsonb column", ({ helper, metadata }) => {
		assert.throws(
			() => helper.getColumnName(metadata, "id", { fieldName: "x", operator: "->>" }),
			"Can't apply json field accessor to id column",
		);
	});

	// --- getWhereExpressionSql: constants ---

	it("op true -> TRUE with no parameters", ({ helper, metadata }) => {
		assert.equal(helper.getWhereExpressionSql(metadata, { op: "true" } as any), { parameters: {}, query: "TRUE" });
	});

	it("op false -> FALSE with no parameters", ({ helper, metadata }) => {
		assert.equal(helper.getWhereExpressionSql(metadata, { op: "false" } as any), {
			parameters: {},
			query: "FALSE",
		});
	});

	// --- getWhereExpressionSql: value ops ---

	it("op equal -> column = :p1", ({ helper, metadata }) => {
		assert.equal(helper.getWhereExpressionSql(metadata, { op: "equal", property: "id", value: 5 } as any), {
			parameters: { p1: 5 },
			query: "id = :p1",
		});
	});

	it("op equal uses jsonFieldAccessor when provided", ({ helper, metadata }) => {
		assert.equal(
			helper.getWhereExpressionSql(metadata, {
				jsonFieldAccessor: { fieldName: "number", operator: "->>" },
				op: "equal",
				property: "data",
				value: 5,
			} as any),
			{ parameters: { p1: 5 }, query: `data->>'number' = :p1` },
		);
	});

	it("op notEqual -> column <> :p1", ({ helper, metadata }) => {
		assert.equal(helper.getWhereExpressionSql(metadata, { op: "notEqual", property: "id", value: 9 } as any), {
			parameters: { p1: 9 },
			query: "id <> :p1",
		});
	});

	it("op between -> column BETWEEN :p1 AND :p2", ({ helper, metadata }) => {
		assert.equal(
			helper.getWhereExpressionSql(metadata, { from: 1, op: "between", property: "amount", to: 10 } as any),
			{ parameters: { p1: 1, p2: 10 }, query: "amount BETWEEN :p1 AND :p2" },
		);
	});

	it("op greaterThanEqual -> column >= :p1", ({ helper, metadata }) => {
		assert.equal(
			helper.getWhereExpressionSql(metadata, { op: "greaterThanEqual", property: "amount", value: 3 } as any),
			{ parameters: { p1: 3 }, query: "amount >= :p1" },
		);
	});

	it("op lessThanEqual -> column <= :p1", ({ helper, metadata }) => {
		assert.equal(
			helper.getWhereExpressionSql(metadata, { op: "lessThanEqual", property: "amount", value: 7 } as any),
			{ parameters: { p1: 7 }, query: "amount <= :p1" },
		);
	});

	it("op like -> column LIKE :p1", ({ helper, metadata }) => {
		assert.equal(helper.getWhereExpressionSql(metadata, { op: "like", pattern: "abc%", property: "from" } as any), {
			parameters: { p1: "abc%" },
			query: `"from" LIKE :p1`,
		});
	});

	it("op contains -> column @> :p1", ({ helper, metadata }) => {
		assert.equal(
			helper.getWhereExpressionSql(metadata, { op: "contains", property: "data", value: { a: 1 } } as any),
			{ parameters: { p1: { a: 1 } }, query: "data @> :p1" },
		);
	});

	it("op notNull -> column IS NOT NULL, no parameters", ({ helper, metadata }) => {
		assert.equal(helper.getWhereExpressionSql(metadata, { op: "notNull", property: "amount" } as any), {
			parameters: {},
			query: "amount IS NOT NULL",
		});
	});

	it("op jsonbAttributeExists -> column ? :p1", ({ helper, metadata }) => {
		assert.equal(
			helper.getWhereExpressionSql(metadata, {
				attribute: "foo",
				op: "jsonbAttributeExists",
				property: "data",
			} as any),
			{ parameters: { p1: "foo" }, query: "data ? :p1" },
		);
	});

	it("op functionSig -> SUBSTRING(column FROM 1 FOR 4) = :p1", ({ helper, metadata }) => {
		assert.equal(
			helper.getWhereExpressionSql(metadata, { op: "functionSig", property: "data", value: "0x12345678" } as any),
			{ parameters: { p1: "0x12345678" }, query: "SUBSTRING(data FROM 1 FOR 4) = :p1" },
		);
	});

	it("op multiPayment -> ARRAY citext with comma-joined value", ({ helper, metadata }) => {
		assert.equal(helper.getWhereExpressionSql(metadata, { op: "multiPayment", value: ["a", "b"] } as any), {
			parameters: { p1: "a,b" },
			query: "multi_payment_recipients @> ARRAY[:p1]::citext[]",
		});
	});

	it("default op -> throws Unexpected expression", ({ helper, metadata }) => {
		assert.throws(() => helper.getWhereExpressionSql(metadata, { op: "nope" } as any), "Unexpected expression");
	});

	// --- and / or: merging + parenthesization + counter ---

	it("op and -> parenthesized AND joining, merges parameters with incrementing counter", ({ helper, metadata }) => {
		assert.equal(
			helper.getWhereExpressionSql(metadata, {
				expressions: [
					{ op: "equal", property: "id", value: 1 },
					{ op: "greaterThanEqual", property: "amount", value: 2 },
				],
				op: "and",
			} as any),
			{ parameters: { p1: 1, p2: 2 }, query: "(id = :p1 AND amount >= :p2)" },
		);
	});

	it("op or -> parenthesized OR joining, merges parameters with incrementing counter", ({ helper, metadata }) => {
		assert.equal(
			helper.getWhereExpressionSql(metadata, {
				expressions: [
					{ op: "equal", property: "id", value: 1 },
					{ op: "equal", property: "amount", value: 2 },
				],
				op: "or",
			} as any),
			{ parameters: { p1: 1, p2: 2 }, query: "(id = :p1 OR amount = :p2)" },
		);
	});

	it("nested and/or nest parentheses and keep a single monotonic parameter counter", ({ helper, metadata }) => {
		assert.equal(
			helper.getWhereExpressionSql(metadata, {
				expressions: [
					{ op: "equal", property: "id", value: 1 },
					{
						expressions: [
							{ op: "equal", property: "amount", value: 2 },
							{ op: "equal", property: "amount", value: 3 },
						],
						op: "or",
					},
				],
				op: "and",
			} as any),
			{ parameters: { p1: 1, p2: 2, p3: 3 }, query: "(id = :p1 AND (amount = :p2 OR amount = :p3))" },
		);
	});

	it("parameter counter advances across separate calls on the same instance", ({ helper, metadata }) => {
		const first = helper.getWhereExpressionSql(metadata, { op: "equal", property: "id", value: 1 } as any);
		const second = helper.getWhereExpressionSql(metadata, { op: "equal", property: "id", value: 2 } as any);
		assert.equal(first, { parameters: { p1: 1 }, query: "id = :p1" });
		assert.equal(second, { parameters: { p2: 2 }, query: "id = :p2" });
	});
});
