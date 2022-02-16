import "jest-extended";

import { parseURI } from "./parse-uri";

describe("#parseURI", () => {
    it("should return all values", () => {
        expect(parseURI("https://domain.com/path?query=value#fragment")).toEqual({
            authority: "domain.com",
            fragment: "fragment",
            path: "/path",
            query: "query=value",
            scheme: "https",
        });
    });

    it("should work just the domain", () => {
        expect(parseURI("https://domain.com/")).toEqual({
            authority: "domain.com",
            fragment: undefined,
            path: "/",
            query: undefined,
            scheme: "https",
        });
    });

    it("should work just the domain and path", () => {
        expect(parseURI("https://domain.com/path")).toEqual({
            authority: "domain.com",
            fragment: undefined,
            path: "/path",
            query: undefined,
            scheme: "https",
        });
    });

    it("should work just the domain and query", () => {
        expect(parseURI("https://domain.com/?query=value")).toEqual({
            authority: "domain.com",
            fragment: undefined,
            path: "/",
            query: "query=value",
            scheme: "https",
        });
    });

    it("should work just the domain and fragment", () => {
        expect(parseURI("https://domain.com/#fragment")).toEqual({
            authority: "domain.com",
            fragment: "fragment",
            path: "/",
            query: undefined,
            scheme: "https",
        });
    });
});
