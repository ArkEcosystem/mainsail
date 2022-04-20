import { describe } from "../../core-test-framework";
import { isArguments } from "./is-arguments";

describe("#isArguments", ({ it, assert }) => {
	it("should pass", () => {
		// @ts-ignore
		assert.true(isArguments(arguments));
	});

	it("should fail", () => {
		assert.false(isArguments(1));
	});
});
