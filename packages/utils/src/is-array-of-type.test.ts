import "jest-extended";

import { isArrayOfType } from "./is-array-of-type";

describe("#isArrayOfType", () => {
    it("should pass", () => {
        expect(isArrayOfType<number>([1], "number")).toBeTrue();
    });

    it("should fail", () => {
        expect(isArrayOfType<number>(["string"], "number")).toBeFalse();
    });
});
