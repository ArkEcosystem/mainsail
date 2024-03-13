import { describe } from "../../test-framework/source";
import { isPromise } from "./is-promise";

describe("isPromise", async ({ assert, it, nock, loader }) => {
	it("should pass", () => {
		assert.true(isPromise(new Promise(() => {})));
	});

	it("should fail", () => {
		assert.false(isPromise(1));
	});
});
