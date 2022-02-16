import { ordinal } from "./ordinal";

describe("#ordinal", () => {
    it("should return the number with the correct suffix", () => {
        expect(ordinal(1)).toBe("1st");
        expect(ordinal(2)).toBe("2nd");
        expect(ordinal(3)).toBe("3rd");
        expect(ordinal(4)).toBe("4th");
        expect(ordinal(10)).toBe("10th");
        expect(ordinal(100)).toBe("100th");
        expect(ordinal(1000)).toBe("1000th");
        expect(ordinal(10000)).toBe("10000th");
        expect(ordinal(100000)).toBe("100000th");
        expect(ordinal(1000000)).toBe("1000000th");
        expect(ordinal(10000000)).toBe("10000000th");
    });
});
