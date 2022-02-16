import "jest-extended";

import { concat } from "./concat";

describe("#concat", () => {
    it("should concatenate all values", () => {
        expect(concat([1], 2, [3], [[4]])).toEqual([1, 2, 3, [4]]);
    });
});
