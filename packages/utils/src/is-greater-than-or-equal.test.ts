import "jest-extended";

import { isGreaterThanOrEqual } from "./is-greater-than-or-equal";

describe("#isGreaterThanOrEqual", () => {
    it("should pass", () => {
        expect(isGreaterThanOrEqual(2, 1)).toBeTrue();
        expect(isGreaterThanOrEqual(1, 1)).toBeTrue();
    });

    it("should fail", () => {
        expect(isGreaterThanOrEqual(5, 10)).toBeFalse();
    });
});
