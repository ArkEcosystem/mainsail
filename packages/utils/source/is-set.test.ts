import { describe } from "../../core-test-framework";
import { isSet } from "./is-set";

describe("isSet", async ({ assert, it, nock, loader }) => {
	it("should pass", () => {
		assert.true(isSet(new Set()));
	});

	it("should fail", () => {
		assert.false(isSet(1));
	});
});
