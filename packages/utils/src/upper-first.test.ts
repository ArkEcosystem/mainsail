import { upperFirst } from "./upper-first";

const dummies = {
    fred: "Fred",
    FRED: "FRED",
    "test space": "Test space",
};

describe("#upperFirst", () => {
    it("should capitalize the given input", () => {
        Object.keys(dummies).forEach(key => {
            expect(upperFirst(key)).toEqual(dummies[key]);
        });
    });
});
