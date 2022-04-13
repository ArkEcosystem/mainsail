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

		for (let i = 0; i < 15; i++) {
			cappedSet.add(i);
		}

		for (let i = 0; i < 5; i++) {
			assert.false(cappedSet.has(i));
		}

		for (let i = 5; i < 15; i++) {
			assert.true(cappedSet.has(i));
		}
	});
});
