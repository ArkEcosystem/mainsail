import { describe } from "../../../test-framework";
import { isMajority } from "./is-majority";

describe("isMajority", ({ assert, it }) => {
	it("should be true", () => {
		for (let i = (53 / 3) * 2 + 1; i <= 53; i++) {
			assert.true(isMajority(i, 53));
		}

		assert.true(isMajority(7, 7));
	});

	it("should be false", () => {
		for (let i = 0; i < (53 / 3) * 2 + 1; i++) {
			assert.false(isMajority(i, 53));
		}

		assert.false(isMajority(0, 0));
	});
});
