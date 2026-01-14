import { describe } from "@mainsail/test-runner";
import { isURL } from "./is-url";

describe("#isURL", ({ it, assert }) => {
	it("should pass", () => {
		assert.true(isURL("https://google.com"));
	});

	it("should fail", () => {
		assert.false(isURL("1"));
	});
});
