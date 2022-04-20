import { describe } from "../../core-test-framework";
import { isNull } from "./is-null";

describe("isNull", async ({ assert, it, nock, loader }) => {
	it("should pass", () => {
		assert.true(isNull(null));
	});

	it("should fail", () => {
		assert.false(isNull("null"));
	});
});
