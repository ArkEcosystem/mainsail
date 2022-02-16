import "jest-extended";

import { lastMapEntry } from "./last-map-entry";

describe("#lastMapEntry", () => {
    it("should return the last entry", () => {
        expect(lastMapEntry(new Map([["Hello", "World"], ["Another", "Planet"]]))).toEqual(["Another", "Planet"]);
    });
});
