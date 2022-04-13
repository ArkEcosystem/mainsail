import { describe } from "../../core-test-framework";

import { getType } from "./get-type";

describe("getType", async ({ assert, it, nock, loader }) => {
	it("should return the type of the given value", () => {
		assert.is(getType([]), "[object Array]");
		assert.is(getType(1), "[object Number]");
		assert.is(getType({}), "[object Object]");
		assert.is(getType("hello"), "[object String]");
	});
});
