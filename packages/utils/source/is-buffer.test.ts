import "jest-extended";

import { isBuffer } from "./is-buffer";

describe("#isBuffer", () => {
	it("should pass", () => {
		expect(isBuffer(Buffer.alloc(1))).toBeTrue();
	});

	it("should fail", () => {
		expect(isBuffer(1)).toBeFalse();
	});
});
