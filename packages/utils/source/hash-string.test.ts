import { describe } from "../../core-test-framework";

import { hashString } from "./hash-string";

describe("hashString", async ({ assert, it, nock, loader }) => {
	it("should return a number for the given string", function () {
		assert.is(hashString("Hello World"), 1_661_258_373);
	});
});
