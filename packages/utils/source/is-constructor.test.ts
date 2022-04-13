import { describe } from "../../core-test-framework";

import { isConstructor } from "./is-constructor";

describe("isConstructor", async ({ assert, it, nock, loader }) => {
	it("should pass", () => {
		assert.true(isConstructor(Date));
	});

	it("should fail", () => {
		assert.false(isConstructor([]));
	});
});
