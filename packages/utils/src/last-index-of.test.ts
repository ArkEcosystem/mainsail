import "jest-extended";

import { lastIndexOf } from "./last-index-of";

describe("#lastIndexOf", () => {
    it("should return the expected index", () => {
        expect(lastIndexOf([1, 2, 1, 2], 2)).toBe(3);
        expect(lastIndexOf([1, 2, 1, 2], 2, 3)).toBe(3);
        expect(lastIndexOf([1, 2, 1, 2], 2, 2)).toBe(1);
        expect(lastIndexOf([1, 2, 1, 2], 3)).toBe(-1);
        expect(lastIndexOf([], 0, -1)).toBe(-1);
    });
});
