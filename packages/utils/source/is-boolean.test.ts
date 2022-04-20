import { describe } from "../../core-test-framework";
import { isBoolean } from "./is-boolean";

describe("isBoolean", async ({ assert, it, nock, loader }) => {
	it("should pass", () => {
		assert.true(isBoolean(true));
	});

	it("should fail", () => {
		assert.false(isBoolean("false"));
	});
});
