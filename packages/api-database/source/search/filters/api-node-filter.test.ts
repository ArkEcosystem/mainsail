import { describe } from "@mainsail/test-runner";

import { ApiNodeFilter } from "./api-node-filter";

describe("ApiNodeFilter", ({ it, assert }) => {
	it("should return {op:true} for empty criteria", async () => {
		assert.equal(await ApiNodeFilter.getExpression(), { op: "true" });
	});

	it("should build an equal expression for a single url field", async () => {
		assert.equal(await ApiNodeFilter.getExpression({ url: "http://a" }), {
			op: "equal",
			property: "url",
			value: "http://a",
		});
	});

	it("should return {op:true} for an unknown key (default branch)", async () => {
		assert.equal(await ApiNodeFilter.getExpression({ unknown: "x" } as any), { op: "true" });
	});

	it("should build an or expression for an array of urls", async () => {
		assert.equal(await ApiNodeFilter.getExpression({ url: ["a", "b"] }), {
			expressions: [
				{ op: "equal", property: "url", value: "a" },
				{ op: "equal", property: "url", value: "b" },
			],
			op: "or",
		});
	});

	it("should build an and expression when multiple fields are given", async () => {
		assert.equal(await ApiNodeFilter.getExpression({ url: "a", version: "1.0.0" }), {
			expressions: [
				{ op: "equal", property: "url", value: "a" },
				{ jsonFieldAccessor: undefined, op: "equal", property: "version", value: "1.0.0" },
			],
			op: "and",
		});
	});

	it("should build a between expression for a numeric version range", async () => {
		assert.equal(await ApiNodeFilter.getExpression({ version: { from: 1, to: 5 } as any }), {
			from: 1,
			jsonFieldAccessor: undefined,
			op: "between",
			property: "version",
			to: 5,
		});
	});

	it("should build an and across multiple top-level criteria", async () => {
		assert.equal(await ApiNodeFilter.getExpression({ url: "a" }, { url: "b" }), {
			expressions: [
				{ op: "equal", property: "url", value: "a" },
				{ op: "equal", property: "url", value: "b" },
			],
			op: "and",
		});
	});
});
