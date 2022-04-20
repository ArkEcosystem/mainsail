import { describe } from "../../core-test-framework";
import { reduceRight } from "./reduce-right";

describe("reduceRight", async ({ assert, it, nock, loader }) => {
	it("should work with an array", () => {
		assert.equal(
			reduceRight(
				[
					[0, 1],
					[2, 3],
					[4, 5],
				],
				(flattened, other) => flattened.concat(other),
				[],
			),
			[4, 5, 2, 3, 0, 1],
		);
	});

	it("should work with an object", () => {
		assert.equal(
			reduceRight(
				{ a: 1, b: 2, c: 1 },
				(result, value, key) => {
					(result[value] || (result[value] = [])).push(key);

					return result;
				},
				{},
			),
			{ 1: ["c", "a"], 2: ["b"] },
		);
	});
});
