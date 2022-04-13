import { describe } from "../../core-test-framework";

import { lastMapValue } from "./last-map-value";

describe("lastMapValue", async ({ assert, it, nock, loader }) => {
	it("should return the last value", () => {
		assert.is(
			lastMapValue(
				new Map([
					["Hello", "World"],
					["Another", "Planet"],
				]),
			),
			"Planet",
		);
	});
});
