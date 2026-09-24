import { describe } from "@mainsail/test-runner";
import { percentile } from "./percentile";

describe("percentile", ({ assert, each }) => {
	each(
		"should return the value at the floored percentile index",
		({ dataset: { values, p, expected } }) => {
			assert.equal(percentile(values, p), expected);
		},
		[
			{ values: [1, 2, 3, 4, 5], p: 50, expected: 3 }, // median of 1..5
			{ values: [1, 2, 3, 4, 5], p: 90, expected: 4 }, // 90th via floor index -> 4 (not the max)
			{ values: [1, 2, 3, 4, 5], p: 10, expected: 1 }, // 10th percentile -> near min
			{ values: [10, 10, 10, 10], p: 90, expected: 10 }, // all equal -> always same
			{ values: [2, 4, 6, 8], p: 50, expected: 4 }, // even-sized input, lower of the two middle values
			{ values: [2, 4, 6, 8], p: 90, expected: 6 }, // 90th -> second highest for n=4
			{ values: [100], p: 90, expected: 100 }, // single element
			{ values: [5, 1, 9, 3, 7], p: 50, expected: 5 }, // unsorted input, median after sort
			{ values: [5, 1, 9, 3, 7], p: 90, expected: 7 }, // unsorted, 90th via floor index (not max)
			{ values: [5, 1, 9, 3, 7], p: 20, expected: 1 }, // low percentile -> min after sort
			{ values: [], p: 50, expected: 0 }, // empty input
			{ values: [1, 2, 3], p: 100, expected: 3 }, // upper bound -> max
			{ values: [1, 2, 3], p: 150, expected: 3 }, // p above 100 is clamped -> max
			{ values: [1, 2, 3], p: 0, expected: 1 }, // lower bound -> min
			{ values: [1, 2, 3], p: -5, expected: 1 }, // p below 0 is clamped -> min
			{ values: [...Array.from({ length: 101 }).keys()], p: 29, expected: 29 }, // (29 / 100) * 100 would floor to 28
			{ values: [...Array.from({ length: 101 }).keys()], p: 57, expected: 57 }, // (57 / 100) * 100 would floor to 56
		],
	);
});
