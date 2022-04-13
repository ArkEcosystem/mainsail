import { describe } from "../../core-test-framework";

import { formatString } from "./format-string";

describe("#formatString", ({ it, assert }) => {
	it("should format the string with an explicit positional index", () => {
		assert.equal(formatString("{0} World", "Hello"), "Hello World");
	});
});
