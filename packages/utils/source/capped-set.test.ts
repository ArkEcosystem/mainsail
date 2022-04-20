import { describe } from "../../core-test-framework";
import { CappedSet } from "./capped-set";

describe("CappedSet", ({ it, assert }) => {
	it("basic", () => {
		const cappedSet = new CappedSet<number>();

		cappedSet.add(20);

		assert.true(cappedSet.has(20));
		assert.false(cappedSet.has(21));
	});

	it("overflow", () => {
		const maxSize = 10;
		const cappedSet = new CappedSet<number>(maxSize);

		for (let index = 0; index < 15; index++) {
			cappedSet.add(index);
		}

		for (let index = 0; index < 5; index++) {
			assert.false(cappedSet.has(index));
		}

		for (let index = 5; index < 15; index++) {
			assert.true(cappedSet.has(index));
		}
	});
});
