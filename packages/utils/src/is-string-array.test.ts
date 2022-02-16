import "jest-extended";

import { isStringArray } from "./is-string-array";

describe("#isStringArray", () => {
    it("should pass", () => {
        expect(isStringArray(["string"])).toBeTrue();
    });

    it("should fail", () => {
        expect(isStringArray([1])).toBeFalse();
    });
});
