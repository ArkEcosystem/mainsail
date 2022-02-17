import "jest-extended";

import { pullAll } from "./pull-all";

describe("#pullAll", () => {
	it("should work with a property", () => {
		expect(pullAll(["a", "b", "c", "a", "b", "c"], ["a", "c"])).toEqual(["b", "b"]);
	});
});
