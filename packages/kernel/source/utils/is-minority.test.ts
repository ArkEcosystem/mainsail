import { describe } from "../../../test-framework/source";
import { isMinority } from "./is-minority";

describe("isMinority", ({ assert, it }) => {
	it("should be true", () => {
		for (let i = 53 / 3 + 1; i <= 53; i++) {
			assert.true(isMinority(i, 53));
		}

		assert.true(isMinority(4, 9));
	});

	it("should be false", () => {
		for (let i = 0; i < 53 / 3 + 1; i++) {
			assert.false(isMinority(i, 53));
		}

		assert.false(isMinority(0, 0));
	});
});
