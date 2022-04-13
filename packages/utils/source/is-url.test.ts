import { describe } from "../../core-test-framework";

import { isURL } from "./is-url";
import { URL } from "url";

describe("#isURL", ({ it, assert }) => {
	it("should pass", () => {
		assert.true(isURL(new URL("https://google.com")));
	});

	it("should fail", () => {
		assert.false(isURL(1));
	});
});
