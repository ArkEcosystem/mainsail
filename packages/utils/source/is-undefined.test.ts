import { describe } from "../../core-test-framework";
import { isUndefined } from "./is-undefined";

describe("isUndefined", async ({ assert, it, nock, loader }) => {
	it("should pass", () => {
		assert.true(isUndefined());
	});

	it("should fail", () => {
		assert.false(isUndefined("undefined"));
	});
});
