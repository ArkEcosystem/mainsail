import { describe } from "../../test-framework/source";
import { lastMapEntry } from "./last-map-entry";

describe("lastMapEntry", async ({ assert, it, nock, loader }) => {
	it("should return the last entry", () => {
		assert.equal(
			lastMapEntry(
				new Map([
					["Hello", "World"],
					["Another", "Planet"],
				]),
			),
			["Another", "Planet"],
		);
	});
});
