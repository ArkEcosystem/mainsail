import { describe } from "../../test-framework/source";
import { isEmptyObject } from "./is-empty-object";

describe("isEmptyObject", async ({ assert, it, nock, loader }) => {
	it("should return true for an empty object", () => {
		assert.true(isEmptyObject({}));
	});
});
