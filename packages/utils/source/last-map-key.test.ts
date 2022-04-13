import { describe } from "../../core-test-framework";

import { lastMapKey } from "./last-map-key";

describe("lastMapKey", async ({ assert, it, nock, loader }) => {
	it("should return the last key", () => {
		assert.is(
			lastMapKey(
				new Map([
					["Hello", "World"],
					["Another", "Planet"],
				]),
			),
			"Another",
		);
	});
});
