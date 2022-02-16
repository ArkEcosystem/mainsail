import "jest-extended";

import { isPromise } from "./is-promise";

describe("#isPromise", () => {
    it("should pass", () => {
        expect(isPromise(new Promise(() => {}))).toBeTrue();
    });

    it("should fail", () => {
        expect(isPromise(1)).toBeFalse();
    });
});
