import "jest-extended";

import { head } from "./head";

describe("#head", () => {
	it("should return the first item", () => {
		expect(head([1, 2, 3, 4, 5])).toBe(1);
	});
});
