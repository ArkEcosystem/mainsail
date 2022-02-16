import "jest-extended";

import { isBigInt } from "./is-bigint";

describe("#isBigInt", () => {
    it("should pass", () => {
        expect(isBigInt(BigInt(1))).toBeTrue();
    });

    it("should fail", () => {
        expect(isBigInt("1")).toBeFalse();
        expect(isBigInt(1)).toBeFalse();
    });
});
