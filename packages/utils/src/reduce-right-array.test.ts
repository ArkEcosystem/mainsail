import "jest-extended";

import { reduceRightArray } from "./reduce-right-array";

describe("#reduceRightArray", () => {
    it("should work with a function", () => {
        expect(reduceRightArray([[0, 1], [2, 3], [4, 5]], (flattened, other) => flattened.concat(other), [])).toEqual([
            4,
            5,
            2,
            3,
            0,
            1,
        ]);
    });
});
