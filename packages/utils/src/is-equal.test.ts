import "jest-extended";

import { isEqual } from "./is-equal";

describe("#isEqual", () => {
    it("should return true for the same strings", () => {
        expect(isEqual("true", "true")).toBeTrue();
    });

    it("should return true for the same numbers", () => {
        expect(isEqual(1, 1)).toBeTrue();
    });

    it("should return true for the same booleans", () => {
        expect(isEqual(true, true)).toBeTrue();
    });

    it("should return true for the same objects", () => {
        expect(isEqual({}, {})).toBeTrue();
    });

    it("should return true for the same arrays", () => {
        expect(isEqual([], [])).toBeTrue();
    });

    it("should return true for the same nulls", () => {
        expect(isEqual(null, null)).toBeTrue();
    });
});
