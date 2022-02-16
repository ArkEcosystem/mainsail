import { prettyBytes } from "./pretty-bytes";

describe("#prettyBytes", () => {
    it("should format the given number", () => {
        expect(prettyBytes(0)).toBe("0 B");
        expect(prettyBytes(0.4)).toBe("0.4 B");
        expect(prettyBytes(0.7)).toBe("0.7 B");
        expect(prettyBytes(10)).toBe("10 B");
        expect(prettyBytes(10.1)).toBe("10.1 B");
        expect(prettyBytes(999)).toBe("999 B");
        expect(prettyBytes(1001)).toBe("1 kB");
        expect(prettyBytes(1001)).toBe("1 kB");
        expect(prettyBytes(1e16)).toBe("10 PB");
        expect(prettyBytes(1e30)).toBe("1,000,000 YB");
    });
});
