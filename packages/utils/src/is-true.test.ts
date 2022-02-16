import "jest-extended";

import { isTrue } from "./is-true";

describe("#isTrue", () => {
    it("should pass", () => {
        expect(isTrue(true)).toBeTrue();
    });

    it("should fail", () => {
        expect(isTrue(false)).toBeFalse();
    });
});
