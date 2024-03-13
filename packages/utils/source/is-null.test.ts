import { describe } from "../../test-framework/source";
import { isNull } from "./is-null";

describe("isNull", async ({ assert, it, nock, loader }) => {
	it("should pass", () => {
		assert.true(isNull(null));
	});

	it("should fail", () => {
		assert.false(isNull("null"));
	});
});
