import "jest-extended";

import { reduceRightObject } from "./reduce-right-object";

describe("#reduceRightObject", () => {
    it("should work with a function", () => {
        expect(
            reduceRightObject(
                { a: 1, b: 2, c: 1 },
                (result, value, key) => {
                    (result[value] || (result[value] = [])).push(key);

                    return result;
                },
                {},
            ),
        ).toEqual({ "1": ["c", "a"], "2": ["b"] });
    });
});
