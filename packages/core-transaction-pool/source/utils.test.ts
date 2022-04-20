import { describe } from "../../core-test-framework";
import { IteratorMany } from ".";

describe("IteratorMany", ({ it, assert }) => {
	it("should choose next item based on comparator", () => {
		const iter1 = [1, 5, 3, 9, 0][Symbol.iterator]();
		const iter2 = [8, 2, 7, 4, 6][Symbol.iterator]();
		const iteratorMany = new IteratorMany([iter1, iter2], (a, b) => a - b);

		// [1, 5, 3, 9, 0], [8, 2, 7, 4, 6]
		assert.equal(iteratorMany.next(), { done: false, value: 1 });
		// [5, 3, 9, 0], [8, 2, 7, 4, 6]
		assert.equal(iteratorMany.next(), { done: false, value: 5 });
		// [3, 9, 0], [8, 2, 7, 4, 6]
		assert.equal(iteratorMany.next(), { done: false, value: 3 });
		// [9, 0], [8, 2, 7, 4, 6]
		assert.equal(iteratorMany.next(), { done: false, value: 8 });
		// [9, 0], [2, 7, 4, 6]
		assert.equal(iteratorMany.next(), { done: false, value: 2 });
		// [9, 0], [7, 4, 6]
		assert.equal(iteratorMany.next(), { done: false, value: 7 });
		// [9, 0], [4, 6]
		assert.equal(iteratorMany.next(), { done: false, value: 4 });
		// [9, 0], [6]
		assert.equal(iteratorMany.next(), { done: false, value: 6 });
		// [9, 0], []
		assert.equal(iteratorMany.next(), { done: false, value: 9 });
		// [0], []
		assert.equal(iteratorMany.next(), { done: false, value: 0 });
		// [], []
		assert.equal(iteratorMany.next(), { done: true, value: undefined });
	});
});
