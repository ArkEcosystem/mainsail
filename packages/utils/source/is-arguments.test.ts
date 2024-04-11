import { describe } from "../../test-framework/source";
import { isArguments } from "./is-arguments";

describe("#isArguments", ({ it, assert }) => {
	// TODO: Fix tests
	it.skip("should pass", () => {
		// @ts-ignore
		assert.true(isArguments(arguments));
	});

	it("should fail", () => {
		assert.false(isArguments(1));
	});
});
