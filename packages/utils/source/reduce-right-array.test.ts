import { describe } from "../../core-test-framework";
import { reduceRightArray } from "./reduce-right-array";

describe("reduceRightArray", async ({ assert, it, nock, loader }) => {
	it("should work with a function", () => {
		assert.equal(
			reduceRightArray(
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
});
