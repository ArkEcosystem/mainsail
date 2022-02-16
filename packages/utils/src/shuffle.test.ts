import "jest-extended";

import { numberArray } from "./number-array";
import { shuffle } from "./shuffle";

describe("#shuffle", () => {
    it("should return a new array with items in random order", () => {
        const possibleValues: number[] = numberArray(100);

        const shuffledValues: number[] = shuffle(possibleValues);

        expect(shuffledValues).toIncludeAllMembers(possibleValues);
        expect(shuffledValues).not.toEqual(possibleValues);
    });
});
