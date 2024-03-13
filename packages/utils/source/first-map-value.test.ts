import { describe } from "../../test-framework/source";
import { firstMapValue } from "./first-map-value";

describe("#firstMapValue", ({ it, assert }) => {
	it("should return the first value", () => {
		assert.equal(firstMapValue(new Map([["Hello", "World"]])), "World");
	});
});
