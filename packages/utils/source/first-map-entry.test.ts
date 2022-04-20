import { describe } from "../../core-test-framework";
import { firstMapEntry } from "./first-map-entry";

describe("#firstMapEntry", ({ it, assert }) => {
	it("should return the first entry", () => {
		assert.equal(firstMapEntry(new Map([["Hello", "World"]])), ["Hello", "World"]);
	});
});
