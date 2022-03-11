import { describe } from "../../../core-test-framework";

import { formatTimestamp } from "./format-timestamp";

describe("Format Timestamp", ({ assert, it }) => {
	it("should compute the correct epoch value", () => {
		assert.is(formatTimestamp(100).epoch, 100);
	});

	it("should compute the correct unix value", () => {
		assert.is(formatTimestamp(100).unix, 1_490_101_300);
	});

	it("should compute the correct human value", () => {
		assert.is(formatTimestamp(100).human, "2017-03-21T13:01:40.000Z");
	});
});
