import { describe } from "../../test-framework/source";
import { percentile } from "./percentile";

describe("percentile", ({ assert, it }) => {
	it("should return expected percentiles", () => {
		const cases: [number[], number, number][] = [
			[[1, 2, 3, 4, 5], 50, 3], // median of 1..5
			[[1, 2, 3, 4, 5], 90, 4], // 90th via floor index -> 4 (not the max)
			[[1, 2, 3, 4, 5], 10, 1], // 10th percentile -> near min
			[[10, 10, 10, 10], 90, 10], // all equal -> always same
			[[2, 4, 6, 8], 50, 4], // even-sized input, linear middle (lower of the two)
			[[2, 4, 6, 8], 90, 6], // 90th -> second highest for n=4
			[[100], 90, 100], // single-element edge case
			[[5, 1, 9, 3, 7], 50, 5], // unsorted input, median after sort -> 5
			[[5, 1, 9, 3, 7], 90, 7], // unsorted, 90th via floor index -> 7 (not max)
			[[5, 1, 9, 3, 7], 20, 1], // low percentile -> min after sort
			[[], 50, 0], // empty array edge case (per implementation)
		];

		for (const [values, p, expected] of cases) {
			const result = percentile(values, p);
			assert.equal(result, expected);
		}
	});
});
