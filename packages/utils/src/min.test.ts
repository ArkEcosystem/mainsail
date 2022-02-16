import "jest-extended";

import { min } from "./min";

describe("#min", () => {
    it("should return the smallest number", () => {
        expect(min([1, 0])).toBe(0);
        expect(min([1, 2, 3, 4, 5])).toBe(1);
    });
});
