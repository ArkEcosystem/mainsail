import "jest-extended";

import { lastMapValue } from "./last-map-value";

describe("#lastMapValue", () => {
    it("should return the last value", () => {
        expect(lastMapValue(new Map([["Hello", "World"], ["Another", "Planet"]]))).toBe("Planet");
    });
});
