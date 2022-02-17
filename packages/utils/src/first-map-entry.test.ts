import "jest-extended";

import { firstMapEntry } from "./first-map-entry";

describe("#firstMapEntry", () => {
	it("should return the first entry", () => {
		expect(firstMapEntry(new Map([["Hello", "World"]]))).toEqual(["Hello", "World"]);
	});
});
