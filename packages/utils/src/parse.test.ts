import "jest-extended";

import { parse } from "./parse";

describe("#parse", () => {
    it("should parse valid json", () => {
        expect(parse("{}")).toEqual({});
    });

    it("should fail to parse invalid json", () => {
        expect(() => parse("{")).toThrow("Unexpected end of JSON input");
    });
});
