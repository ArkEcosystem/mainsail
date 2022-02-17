import "jest-extended";

import { safeEqual } from "./safe-equal";

describe("#safeEqual", () => {
	it("should determine if values are equal in a safe manner", () => {
		expect(safeEqual(new Uint8Array(1), new Uint8Array(1))).toBeTrue();
		expect(safeEqual(new Uint8Array(1), new Uint8Array(2))).toBeFalse();

		expect(safeEqual(new Uint16Array(1), new Uint16Array(1))).toBeTrue();
		expect(safeEqual(new Uint16Array(1), new Uint16Array(2))).toBeFalse();

		expect(safeEqual(new Uint32Array(1), new Uint32Array(1))).toBeTrue();
		expect(safeEqual(new Uint32Array(1), new Uint32Array(2))).toBeFalse();

		expect(safeEqual(Buffer.alloc(1), Buffer.alloc(1))).toBeTrue();
		expect(safeEqual(Buffer.alloc(1), Buffer.alloc(2))).toBeFalse();
	});
});
