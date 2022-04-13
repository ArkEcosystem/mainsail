import { describe } from "../../core-test-framework";

import { zipObject } from "./zip-object";

describe("zipObject", async ({ assert, it, nock, loader }) => {
	it("should create an object from the keys and values", () => {
		assert.equal(zipObject(["a", "b"], [1, 2]), { a: 1, b: 2 });
	});
});
