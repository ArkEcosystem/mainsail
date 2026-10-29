import { describe } from "@mainsail/test-runner";
import { packBitmap, unpackBitmap } from "./headers.js";

describe("packBitmap / unpackBitmap", ({ it, assert }) => {
	it("should prefix the count and use one bit per validator", () => {
		const packed = packBitmap([true, false, true]);

		assert.equal(packed.length, 2);
		assert.equal(packed[0], 3);
		assert.equal(packed[1], 0b101);
	});

	it("should pack 53 validators into 8 bytes instead of 53", () => {
		assert.equal(packBitmap(Array.from({ length: 53 }).fill(true) as boolean[]).length, 8);
	});

	it("should round-trip bitmaps of any length", () => {
		for (const length of [0, 1, 7, 8, 9, 53, 64]) {
			const bitmap = Array.from({ length }, (_, index) => index % 3 === 0);

			assert.equal(unpackBitmap(packBitmap(bitmap)), bitmap);
		}
	});

	it("should round-trip all-false and all-true bitmaps", () => {
		for (const signed of [false, true]) {
			const bitmap = Array.from({ length: 53 }).fill(signed) as boolean[];

			assert.equal(unpackBitmap(packBitmap(bitmap)), bitmap);
		}
	});

	it("should unpack an absent bitmap to an empty one", () => {
		assert.equal(unpackBitmap(new Uint8Array()), []);
		// eslint-disable-next-line unicorn/no-null
		assert.equal(unpackBitmap(null), []);
		assert.equal(unpackBitmap(undefined), []);
	});

	it("should reject a bitmap that contradicts its own count byte", () => {
		// Count byte claims 10 validators (2 data bytes), but only 1 follows.
		assert.throws(() => unpackBitmap(Buffer.from([10, 0xff])));
		// Count byte claims 3 validators (1 data byte), but 2 follow.
		assert.throws(() => unpackBitmap(Buffer.from([3, 0xff, 0x00])));
	});

	it("should reject a bitmap with set bits beyond its count", () => {
		// Count byte claims 3 validators, but bit 3 is set.
		assert.throws(() => unpackBitmap(Buffer.from([3, 0b1101])));
	});

	it("should reject a bitmap longer than the count byte can hold", () => {
		assert.throws(() => packBitmap(Array.from({ length: 256 }).fill(false) as boolean[]));
	});
});
