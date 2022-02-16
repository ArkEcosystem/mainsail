import "jest-extended";

import { firstMapValue } from "./first-map-value";

describe("#firstMapValue", () => {
    it("should return the first value", () => {
        expect(firstMapValue(new Map([["Hello", "World"]]))).toBe("World");
    });
});
