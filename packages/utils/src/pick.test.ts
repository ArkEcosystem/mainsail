import "jest-extended";

import { pick } from "./pick";

describe("#pick", () => {
    it("should return an object with only the given properties", () => {
        expect(pick({ a: 1, b: "2", c: 3 }, ["a", "c"])).toEqual({ a: 1, c: 3 });
    });
});
