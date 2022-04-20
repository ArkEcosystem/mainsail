import { describe } from "../../core-test-framework";
import { isAsyncFunction } from "./is-async-function";

describe("isAsyncFunction", async ({ assert, it, nock, loader }) => {
	it("should pass", () => {
		assert.true(isAsyncFunction(async () => ({})));
	});

	it("should fail", () => {
		assert.false(isAsyncFunction(new Function()));
		assert.false(isAsyncFunction([]));
	});
});
