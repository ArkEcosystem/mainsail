import "jest-extended";

import { isUndefined } from "./is-undefined";

describe("#isUndefined", () => {
    it("should pass", () => {
        expect(isUndefined(undefined)).toBeTrue();
    });

    it("should fail", () => {
        expect(isUndefined("undefined")).toBeFalse();
    });
});
