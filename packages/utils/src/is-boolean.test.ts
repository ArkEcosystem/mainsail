import "jest-extended";

import { isBoolean } from "./is-boolean";

describe("#isBoolean", () => {
	it("should pass", () => {
		expect(isBoolean(true)).toBeTrue();
	});

	it("should fail", () => {
		expect(isBoolean("false")).toBeFalse();
	});
});
