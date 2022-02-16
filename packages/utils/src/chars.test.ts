import { chars } from "./chars";

describe("#chars", () => {
    it("should return all characters of the string as an array", () => {
        expect(chars("Hello World")).toEqual(["H", "e", "l", "l", "o", " ", "W", "o", "r", "l", "d"]);
    });
});
