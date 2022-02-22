import { describe } from "@arkecosystem/core-test-framework";

import { conditions } from "./conditions";
const { between, contains, eq, falsy, gt, gte, lt, lte, ne, notBetween, regexp, truthy } = conditions;

describe("Conditions.between", ({ it, assert }) => {
	it("should be true", () => {
		assert.true(between(2, { max: 3, min: 1 }));
		assert.true(between("2", { max: "3", min: "1" }));
	});

	it("should be false", () => {
		assert.false(between(3, { max: 2, min: 1 }));
		assert.false(between("3", { max: "2", min: "1" }));
	});
});

describe("Conditions.contains", ({ it, assert }) => {
	it("should be true", () => {
		assert.true(contains("Hello World", "Hello"));
	});

	it("should be false", () => {
		assert.false(contains("Hello World", "invalid"));
	});
});

describe("Conditions.eq", ({ it, assert }) => {
	it("should be true", () => {
		assert.true(eq(1, 1));
		assert.true(eq("1", "1"));
	});

	it("should be false", () => {
		assert.false(eq(1, 2));
		assert.false(eq("1", "2"));
	});
});

describe("Conditions.falsy", ({ it, assert }) => {
	it("should be true", () => {
		assert.true(falsy(false));
		assert.true(falsy("false"));
		assert.true(falsy("FaLsE"));
	});

	it("should be false", () => {
		assert.false(falsy(true));
		assert.false(falsy("true"));
		assert.false(falsy("TrUe"));
	});
});

describe("Conditions.gt", ({ it, assert }) => {
	it("should be true", () => {
		assert.true(gt(2, 1));
		assert.true(gt("2", "1"));
		assert.true(gt("10", "2"));
	});

	it("should be false", () => {
		assert.false(gt(1, 2));
		assert.false(gt("1", "2"));
		assert.false(gt("2", "10"));
		assert.false(gt(undefined, Number.NaN));
		assert.false(gt(1, Number.NaN));
		assert.false(gt(undefined, 1));
		assert.false(gt("null", "NaN"));
		assert.false(gt("1", "NaN"));
		assert.false(gt("null", "1"));
	});
});

describe("Conditions.gte", ({ it, assert }) => {
	it("should be true", () => {
		assert.true(gte(2, 1));
		assert.true(gte(2, 2));
		assert.true(gte("2", "1"));
		assert.true(gte("2", "2"));
	});

	it("should be false", () => {
		assert.false(gte(1, 2));
		assert.false(gte("1", "2"));
		assert.false(gte(undefined, Number.NaN));
		assert.false(gte(1, Number.NaN));
		assert.false(gte(undefined, 1));
		assert.false(gte("null", "NaN"));
		assert.false(gte("1", "NaN"));
		assert.false(gte("null", "1"));
	});
});

describe("Conditions.lt", ({ it, assert }) => {
	it("should be true", () => {
		assert.true(lt(1, 2));
		assert.true(lt("1", "2"));
	});

	it("should be false", () => {
		assert.false(lt(2, 1));
		assert.false(lt("2", "1"));
		assert.false(lt(undefined, Number.NaN));
		assert.false(lt(1, Number.NaN));
		assert.false(lt(undefined, 1));
		assert.false(lt("null", "NaN"));
		assert.false(lt("1", "NaN"));
		assert.false(lt("null", "1"));
	});
});

describe("Conditions.lte", ({ it, assert }) => {
	it("should be true", () => {
		assert.true(lte(1, 2));
		assert.true(lte(1, 1));
		assert.true(lte("1", "2"));
		assert.true(lte("1", "1"));
	});

	it("should be false", () => {
		assert.false(lte(2, 1));
		assert.false(lte("2", "1"));
		assert.false(lte(undefined, Number.NaN));
		assert.false(lte(1, Number.NaN));
		assert.false(lte(undefined, 1));
		assert.false(lte("null", "NaN"));
		assert.false(lte("1", "NaN"));
		assert.false(lte("null", "1"));
	});
});

describe("Conditions.ne", ({ it, assert }) => {
	it("should be true", () => {
		assert.true(ne(1, 2));
		assert.true(ne("1", "2"));
	});

	it("should be false", () => {
		assert.false(ne(1, 1));
		assert.false(ne("1", "1"));
	});
});

describe("Conditions.notBetween", ({ it, assert }) => {
	it("should be true", () => {
		assert.true(
			notBetween(3, {
				max: 2,
				min: 1,
			}),
		);
		assert.true(
			notBetween("3", {
				max: "2",
				min: "1",
			}),
		);
	});

	it("should be false", () => {
		assert.false(
			notBetween(2, {
				max: 3,
				min: 1,
			}),
		);
		assert.false(
			notBetween("2", {
				max: "3",
				min: "1",
			}),
		);
	});
});

describe("Conditions.regexp", ({ it, assert }) => {
	it("should be true", () => {
		assert.true(regexp("hello world!", "hello"));
	});

	it("should be false", () => {
		assert.false(regexp(123, "w+"));
	});
});

describe("Conditions.truthy", ({ it, assert }) => {
	it("should be true", () => {
		assert.true(truthy(true));
		assert.true(truthy("true"));
		assert.true(truthy("TrUe"));
	});

	it("should be false", () => {
		assert.false(truthy(false));
		assert.false(truthy("false"));
		assert.false(truthy("FaLsE"));
	});
});
