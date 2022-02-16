import "jest-extended";

import { isNotBetween } from "./is-not-between";

describe("#isNotBetween", () => {
    it("should pass", () => {
        expect(isNotBetween(1, 2, 3)).toBeTrue();
    });

    it("should fail", () => {
        expect(isNotBetween(2, 1, 3)).toBeFalse();
    });
});
