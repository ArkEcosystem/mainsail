import "jest-extended";

import { minBy } from "./min-by";

describe("#minBy", () => {
    it("should work with a function", () => {
        expect(minBy([{ n: 2 }, { n: 3 }, { n: 1 }, { n: 5 }, { n: 4 }], o => o.n)).toEqual({ n: 1 });
    });
});
