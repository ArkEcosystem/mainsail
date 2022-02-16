import "jest-extended";

import { reverse } from "./reverse";

describe("#reverse", () => {
    it("should work with a string", () => {
        expect(reverse("abc")).toEqual("cba");
    });
});
