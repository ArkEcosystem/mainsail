import { describe } from "@mainsail/test-runner";

import {
	everyOrCriteria,
	handleAndCriteria,
	handleComparisonCriteria,
	handleOrCriteria,
	hasOrCriteria,
	optimizeExpression,
	someOrCriteria,
} from "./search";

describe("optimizeExpression", ({ it, assert }) => {
	it("should pass through leaf ops unchanged (default)", () => {
		const expr = { op: "equal", property: "a", value: 1 } as any;
		assert.equal(optimizeExpression(expr), expr);
	});

	it("should flatten nested and expressions", () => {
		const expr = {
			expressions: [
				{ op: "equal", property: "a", value: 1 },
				{
					expressions: [
						{ op: "equal", property: "b", value: 2 },
						{ op: "equal", property: "c", value: 3 },
					],
					op: "and",
				},
			],
			op: "and",
		} as any;

		assert.equal(optimizeExpression(expr), {
			expressions: [
				{ op: "equal", property: "a", value: 1 },
				{ op: "equal", property: "b", value: 2 },
				{ op: "equal", property: "c", value: 3 },
			],
			op: "and",
		});
	});

	it("should collapse and with all-true to true", () => {
		const expr = { expressions: [{ op: "true" }, { op: "true" }], op: "and" } as any;
		assert.equal(optimizeExpression(expr), { op: "true" });
	});

	it("should collapse and with any false to false", () => {
		const expr = {
			expressions: [{ op: "equal", property: "a", value: 1 }, { op: "false" }],
			op: "and",
		} as any;
		assert.equal(optimizeExpression(expr), { op: "false" });
	});

	it("should drop true elements from and", () => {
		const expr = {
			expressions: [
				{ op: "true" },
				{ op: "equal", property: "a", value: 1 },
				{ op: "equal", property: "b", value: 2 },
			],
			op: "and",
		} as any;
		assert.equal(optimizeExpression(expr), {
			expressions: [
				{ op: "equal", property: "a", value: 1 },
				{ op: "equal", property: "b", value: 2 },
			],
			op: "and",
		});
	});

	it("should unwrap single-element and", () => {
		const expr = {
			expressions: [{ op: "true" }, { op: "equal", property: "a", value: 1 }],
			op: "and",
		} as any;
		assert.equal(optimizeExpression(expr), { op: "equal", property: "a", value: 1 });
	});

	it("should flatten nested or expressions", () => {
		const expr = {
			expressions: [
				{ op: "equal", property: "a", value: 1 },
				{
					expressions: [
						{ op: "equal", property: "b", value: 2 },
						{ op: "equal", property: "c", value: 3 },
					],
					op: "or",
				},
			],
			op: "or",
		} as any;

		assert.equal(optimizeExpression(expr), {
			expressions: [
				{ op: "equal", property: "a", value: 1 },
				{ op: "equal", property: "b", value: 2 },
				{ op: "equal", property: "c", value: 3 },
			],
			op: "or",
		});
	});

	it("should collapse or with all-false to false", () => {
		const expr = { expressions: [{ op: "false" }, { op: "false" }], op: "or" } as any;
		assert.equal(optimizeExpression(expr), { op: "false" });
	});

	it("should collapse or with any true to true", () => {
		const expr = {
			expressions: [{ op: "equal", property: "a", value: 1 }, { op: "true" }],
			op: "or",
		} as any;
		assert.equal(optimizeExpression(expr), { op: "true" });
	});

	it("should drop false elements from or", () => {
		const expr = {
			expressions: [
				{ op: "false" },
				{ op: "equal", property: "a", value: 1 },
				{ op: "equal", property: "b", value: 2 },
			],
			op: "or",
		} as any;
		assert.equal(optimizeExpression(expr), {
			expressions: [
				{ op: "equal", property: "a", value: 1 },
				{ op: "equal", property: "b", value: 2 },
			],
			op: "or",
		});
	});

	it("should unwrap single-element or", () => {
		const expr = {
			expressions: [{ op: "false" }, { op: "equal", property: "a", value: 1 }],
			op: "or",
		} as any;
		assert.equal(optimizeExpression(expr), { op: "equal", property: "a", value: 1 });
	});
});

describe("someOrCriteria", ({ it, assert }) => {
	it("should return false for undefined", () => {
		assert.false(someOrCriteria(undefined as any, () => true));
	});

	it("should apply predicate to single criteria", () => {
		assert.true(someOrCriteria(5 as any, (c: number) => c === 5));
		assert.false(someOrCriteria(5 as any, (c: number) => c === 6));
	});

	it("should return true if any array element matches", () => {
		assert.true(someOrCriteria([1, 2, 3] as any, (c: number) => c === 2));
		assert.false(someOrCriteria([1, 2, 3] as any, (c: number) => c === 4));
	});
});

describe("everyOrCriteria", ({ it, assert }) => {
	it("should return true for undefined", () => {
		assert.true(everyOrCriteria(undefined as any, () => false));
	});

	it("should apply predicate to single criteria", () => {
		assert.true(everyOrCriteria(5 as any, (c: number) => c === 5));
		assert.false(everyOrCriteria(5 as any, (c: number) => c === 6));
	});

	it("should return true only if all array elements match", () => {
		assert.true(everyOrCriteria([1, 1, 1] as any, (c: number) => c === 1));
		assert.false(everyOrCriteria([1, 2, 1] as any, (c: number) => c === 1));
	});
});

describe("hasOrCriteria", ({ it, assert }) => {
	it("should return false for undefined", () => {
		assert.false(hasOrCriteria(undefined as any));
	});

	it("should return true for single criteria", () => {
		assert.true(hasOrCriteria(5 as any));
	});

	it("should return true for non-empty array and false for empty", () => {
		assert.true(hasOrCriteria([1] as any));
		assert.false(hasOrCriteria([] as any));
	});
});

describe("handleAndCriteria", ({ it, assert }) => {
	it("should build and expression skipping undefined keys and awaiting callback", async () => {
		const criteria = { a: 1, b: undefined, c: 3 } as any;

		const result = await handleAndCriteria(criteria, async (key) => ({
			op: "equal" as const,
			property: key,
			value: (criteria as any)[key],
		}));

		assert.equal(result, {
			expressions: [
				{ op: "equal", property: "a", value: 1 },
				{ op: "equal", property: "c", value: 3 },
			],
			op: "and",
		});
	});

	it("should produce empty and expression when all keys undefined", async () => {
		const result = await handleAndCriteria({ a: undefined } as any, async (key) => ({
			op: "true" as const,
		}));

		assert.equal(result, { expressions: [], op: "and" });
	});
});

describe("handleOrCriteria", ({ it, assert }) => {
	it("should map array to or of many", async () => {
		const result = await handleOrCriteria([1, 2] as any, async (c: number) => ({
			op: "equal" as const,
			property: "a",
			value: c,
		}));

		assert.equal(result, {
			expressions: [
				{ op: "equal", property: "a", value: 1 },
				{ op: "equal", property: "a", value: 2 },
			],
			op: "or",
		});
	});

	it("should wrap single criteria into or of one", async () => {
		const result = await handleOrCriteria(7 as any, async (c: number) => ({
			op: "equal" as const,
			property: "a",
			value: c,
		}));

		assert.equal(result, {
			expressions: [{ op: "equal", property: "a", value: 7 }],
			op: "or",
		});
	});
});

describe("handleComparisonCriteria", ({ it, assert }) => {
	it("should produce between when from and to present", async () => {
		const result = await handleComparisonCriteria("amount" as any, { from: 1, to: 10 } as any);
		assert.equal(result, {
			from: 1,
			jsonFieldAccessor: undefined,
			op: "between",
			property: "amount",
			to: 10,
		});
	});

	it("should produce greaterThanEqual when only from present", async () => {
		const result = await handleComparisonCriteria("amount" as any, { from: 5 } as any);
		assert.equal(result, {
			jsonFieldAccessor: undefined,
			op: "greaterThanEqual",
			property: "amount",
			value: 5,
		});
	});

	it("should produce lessThanEqual when only to present", async () => {
		const result = await handleComparisonCriteria("amount" as any, { to: 5 } as any);
		assert.equal(result, {
			jsonFieldAccessor: undefined,
			op: "lessThanEqual",
			property: "amount",
			value: 5,
		});
	});

	it("should produce equal for scalar criteria", async () => {
		const result = await handleComparisonCriteria("amount" as any, 42 as any);
		assert.equal(result, {
			jsonFieldAccessor: undefined,
			op: "equal",
			property: "amount",
			value: 42,
		});
	});

	it("should thread jsonFieldAccessor through", async () => {
		const accessor = { attribute: "x", cast: "text" } as any;
		const result = await handleComparisonCriteria("amount" as any, { from: 1, to: 2 } as any, accessor);
		assert.is((result as any).jsonFieldAccessor, accessor);
	});
});
