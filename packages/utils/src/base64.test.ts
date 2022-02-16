import { base64 } from "./base64";

describe("#base64", () => {
    it("should encode the given string", () => {
        expect(base64.encode("Hello World")).toBe("SGVsbG8gV29ybGQ=");
    });

    it("should decode the given string", () => {
        expect(base64.decode("SGVsbG8gV29ybGQ=")).toBe("Hello World");
    });
});
