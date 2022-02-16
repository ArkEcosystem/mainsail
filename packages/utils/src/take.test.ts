import "jest-extended";

import { take } from "./take";

describe("#take", () => {
    it("should take the given number of items", () => {
        expect(take([1, 2, 3])).toEqual([1]);
        expect(take([1, 2, 3], 2)).toEqual([1, 2]);
        expect(take([1, 2, 3], 5)).toEqual([1, 2, 3]);
        expect(take([1, 2, 3], 0)).toEqual([]);
    });
});
