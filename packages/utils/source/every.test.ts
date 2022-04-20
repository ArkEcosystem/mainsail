import { describe } from "../../core-test-framework";
import { every } from "./every";
import { isBoolean } from "./is-boolean";

describe("#every", ({ it, assert }) => {
	it("should work with a functions", () => {
		assert.true(every([true, false], isBoolean));
		assert.false(every([true, false, "yes"], isBoolean));
	});
});
