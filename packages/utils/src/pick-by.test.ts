import "jest-extended";

import { isNumber } from "./is-number";
import { pickBy } from "./pick-by";

describe("#pickBy", () => {
    it("should work with a function", () => {
        expect(pickBy({ a: 1, b: "2", c: 3 }, isNumber)).toEqual({ a: 1, c: 3 });
    });
});
