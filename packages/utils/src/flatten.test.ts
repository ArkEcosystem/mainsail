import "jest-extended";

import { flatten } from "./flatten";

describe("#flatten", () => {
    it("should return a flattened array", () => {
        expect(flatten([1, [2, 3], [4, [5, [6, 7]]]])).toEqual([1, 2, 3, 4, 5, 6, 7]);
        expect(flatten([1, [2, 3], 4, [5, [6, [7], 8], 9], 10])).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    });
});
