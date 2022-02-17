import "jest-extended";

import { sample } from "./sample";

describe("#sample", () => {
	it("should return a random item", () => {
		expect(sample([1, 2, 3, 4, 5])).toBeNumber();
	});
});
