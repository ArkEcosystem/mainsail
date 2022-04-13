import { describe } from "../../core-test-framework";

import { isNumber } from "./is-number";

describe("isNumber", async ({ assert, it, nock, loader }) => {
	it("should pass", () => {
		assert.true(isNumber(1));
	});

	it("should fail", () => {
		assert.false(isNumber("1"));
	});
});
