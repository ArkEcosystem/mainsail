import { fill } from "./fill";

describe("#fill", () => {
	it("should work with an array", () => {
		expect(fill([1, 2, 3], "a")).toEqual(["a", "a", "a"]);
		expect(fill(Array(3), 2)).toEqual([2, 2, 2]);
		expect(fill([4, 6, 8, 10], "*", 1, 3)).toEqual([4, "*", "*", 10]);
	});
});
