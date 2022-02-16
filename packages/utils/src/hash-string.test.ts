import { hashString } from "./hash-string";

describe("#hashString", () => {
    it("should return a number for the given string", function() {
        expect(hashString("Hello World")).toEqual(1661258373);
    });
});
