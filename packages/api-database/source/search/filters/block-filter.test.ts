import { describe } from "@mainsail/test-runner";

import { BlockFilter } from "./block-filter";

describe("BlockFilter", ({ it, assert }) => {
	it("should return { op: true } for empty criteria", async () => {
		const expression = await BlockFilter.getExpression({});

		assert.equal(expression, { op: "true" });
	});

	it("should return { op: true } for unknown key", async () => {
		// @ts-ignore
		const expression = await BlockFilter.getExpression({ unknown: "value" });

		assert.equal(expression, { op: "true" });
	});

	it("should compare equal for a hash criteria", async () => {
		const expression = await BlockFilter.getExpression({ hash: "abc" });

		assert.equal(expression, { op: "equal", property: "hash", value: "abc" });
	});

	it("should compare equal for a proposer criteria", async () => {
		const expression = await BlockFilter.getExpression({ proposer: "0x01" });

		assert.equal(expression, { op: "equal", property: "proposer", value: "0x01" });
	});

	it("should map each string-valued field to an equal expression", async () => {
		for (const property of ["version", "parentHash", "transactionsRoot"] as const) {
			const expression = await BlockFilter.getExpression({ [property]: "x" } as any);

			assert.equal(expression, { op: "equal", property, value: "x" });
		}
	});

	it("should map each numeric field to a comparison expression", async () => {
		for (const property of [
			"timestamp",
			"round",
			"transactionsCount",
			"amount",
			"fee",
			"reward",
			"payloadSize",
		] as const) {
			const expression = await BlockFilter.getExpression({ [property]: 9 } as any);

			assert.equal(expression, { jsonFieldAccessor: undefined, op: "equal", property, value: 9 });
		}
	});

	it("should compare equal for a numeric scalar criteria", async () => {
		const expression = await BlockFilter.getExpression({ number: 5 });

		assert.equal(expression, { jsonFieldAccessor: undefined, op: "equal", property: "number", value: 5 });
	});

	it("should build a between expression for from & to", async () => {
		const expression = await BlockFilter.getExpression({ number: { from: 1, to: 10 } });

		assert.equal(expression, {
			from: 1,
			jsonFieldAccessor: undefined,
			op: "between",
			property: "number",
			to: 10,
		});
	});

	it("should build a greaterThanEqual expression for from only", async () => {
		const expression = await BlockFilter.getExpression({ number: { from: 3 } });

		assert.equal(expression, {
			jsonFieldAccessor: undefined,
			op: "greaterThanEqual",
			property: "number",
			value: 3,
		});
	});

	it("should build a lessThanEqual expression for to only", async () => {
		const expression = await BlockFilter.getExpression({ round: { to: 7 } });

		assert.equal(expression, {
			jsonFieldAccessor: undefined,
			op: "lessThanEqual",
			property: "round",
			value: 7,
		});
	});

	it("should AND multiple fields together", async () => {
		const expression = await BlockFilter.getExpression({ hash: "abc", number: 5 });

		assert.equal(expression, {
			expressions: [
				{ op: "equal", property: "hash", value: "abc" },
				{ jsonFieldAccessor: undefined, op: "equal", property: "number", value: 5 },
			],
			op: "and",
		});
	});

	it("should OR array values for a single field", async () => {
		const expression = await BlockFilter.getExpression({ hash: ["a", "b"] });

		assert.equal(expression, {
			expressions: [
				{ op: "equal", property: "hash", value: "a" },
				{ op: "equal", property: "hash", value: "b" },
			],
			op: "or",
		});
	});

	it("should OR across multiple top-level criteria (varargs)", async () => {
		const expression = await BlockFilter.getExpression({ hash: "a" }, { hash: "b" });

		assert.equal(expression, {
			expressions: [
				{ op: "equal", property: "hash", value: "a" },
				{ op: "equal", property: "hash", value: "b" },
			],
			op: "and",
		});
	});
});
