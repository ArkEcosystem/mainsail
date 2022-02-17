import "jest-extended";

import { isBetween } from "./is-between";

describe("#isBetween", () => {
	it("should pass", () => {
		expect(isBetween(2, 1, 3)).toBeTrue();
	});

	it("should fail", () => {
		expect(isBetween(1, 2, 3)).toBeFalse();
	});
});
