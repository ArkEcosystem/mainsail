import "jest-extended";

import { at } from "./at";

describe("#at", () => {
    it("should work like lodash", () => {
        const object = {
            a: { b: { c: 3 } },
            x: { y: { z: 4 } },
        };

        expect(at(object, ["a.b.c", "x.y.z"])).toEqual([3, 4]);
    });
});
