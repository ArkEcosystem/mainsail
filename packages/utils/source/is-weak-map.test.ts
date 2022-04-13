import { describe } from "../../core-test-framework";

import { isWeakMap } from "./is-weak-map";

describe("isWeakMap", async ({ assert, it, nock, loader }) => {
	it("should pass", () => {
		assert.true(isWeakMap(new WeakMap()));
	});

	it("should fail", () => {
		assert.false(isWeakMap(1));
	});
});
