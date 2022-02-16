import "jest-extended";

import { map } from "./map";

describe("#map", () => {
    it("should work like lodash", () => {
        expect(map([4, 8], n => n * n)).toEqual([16, 64]);
    });

    it("should work like lodash", () => {
        expect(map({ a: 4, b: 8 }, n => n * n)).toEqual([16, 64]);
    });
});
