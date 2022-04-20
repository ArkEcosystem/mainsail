import { describe } from "../../core-test-framework";
import { isError } from "./is-error";

describe("isError", async ({ assert, it, nock, loader }) => {
	it("should pass", () => {
		assert.true(isError(new Error()));
	});

	it("should fail", () => {
		assert.false(isError(1));
	});
});
