import "jest-extended";

import { isEmpty } from "./is-empty";

describe("#isEmpty", () => {
    it("should return true for an empty array", () => {
        expect(isEmpty([])).toBeTrue();
    });

    it("should return true for an empty object", () => {
        expect(isEmpty({})).toBeTrue();
    });

    it("should return true for a false boolean", () => {
        expect(isEmpty(false)).toBeTrue();
    });

    it("should return true for null", () => {
        expect(isEmpty(null)).toBeTrue();
    });

    it("should return true for undefined", () => {
        expect(isEmpty(undefined)).toBeTrue();
    });

    it("should return true for an empty map", () => {
        expect(isEmpty(new Map())).toBeTrue();
    });

    it("should return true for an empty set", () => {
        expect(isEmpty(new Set())).toBeTrue();
    });

    it("should return false if the value contains something", () => {
        expect(isEmpty([1])).toBeFalse();
    });
});
