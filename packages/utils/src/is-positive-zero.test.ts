import "jest-extended";

import { isPositiveZero } from "./is-positive-zero";

describe("#isPositiveZero", () => {
    it("should pass", () => {
        expect(isPositiveZero(+0)).toBeTrue();
        expect(isPositiveZero(0)).toBeTrue();
    });

    it("should fail", () => {
        expect(isPositiveZero(-0)).toBeFalse();
        expect(isPositiveZero(-1)).toBeFalse();
    });
});
