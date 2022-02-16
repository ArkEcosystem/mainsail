import "jest-extended";

import { isError } from "./is-error";

describe("#isError", () => {
    it("should pass", () => {
        expect(isError(new Error())).toBeTrue();
    });

    it("should fail", () => {
        expect(isError(1)).toBeFalse();
    });
});
