import { getPathSegments } from "./get-path-segments";

describe("#getPathSegments", () => {
    it("should return an array as is", () => {
        expect(getPathSegments(["a", "b"])).toEqual(["a", "b"]);
    });

    it("should return the path as array", () => {
        expect(getPathSegments("a.b")).toEqual(["a", "b"]);
    });

    it("should return an empty array if any dangerous paths are used", () => {
        expect(getPathSegments("a.__proto__")).toEqual([]);
        expect(getPathSegments("a.prototype")).toEqual([]);
        expect(getPathSegments("a.constructor")).toEqual([]);
    });
});
