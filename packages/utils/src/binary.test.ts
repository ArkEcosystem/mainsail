import { binary } from "./binary";

describe("#binary", () => {
    it("should encode the given string", () => {
        expect(binary.encode("Hello World")).toBe(
            "1001000 1100101 1101100 1101100 1101111 100000 1010111 1101111 1110010 1101100 1100100",
        );
    });

    it("should decode the given string", () => {
        expect(
            binary.decode("1001000 1100101 1101100 1101100 1101111 100000 1010111 1101111 1110010 1101100 1100100"),
        ).toBe("Hello World");
    });
});
