import { prettyTime } from "./pretty-time";

describe("#prettyTime", () => {
	it("should turn the given milliseconds into a human readable format", () => {
		expect(prettyTime(1000000000)).toBe("11d 13h 46m 40s");
		expect(prettyTime(1500)).toBe("1s 500ms");
		expect(prettyTime(1000)).toBe("1s");
		expect(prettyTime(100)).toBe("100ms");
		expect(prettyTime(100.1001)).toBe("100ms 100µs 100ns");
	});
});
