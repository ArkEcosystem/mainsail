import { getType } from "./get-type";

describe("#getType", () => {
	it("should return the type of the given value", () => {
		expect(getType([])).toBe("[object Array]");
		expect(getType(1)).toBe("[object Number]");
		expect(getType({})).toBe("[object Object]");
		expect(getType("hello")).toBe("[object String]");
	});
});
