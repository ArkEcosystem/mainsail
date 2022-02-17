import { intersection } from "./intersection";

describe("#intersection", () => {
	it("should return the common values", () => {
		expect(intersection([2, 1], [2, 3])).toEqual([2]);
		expect(intersection([], [])).toEqual([]);
		expect(intersection(["a"], ["a"])).toEqual(["a"]);
		expect(intersection([true], [true])).toEqual([true]);
		expect(intersection([false], [false])).toEqual([false]);
	});
});
