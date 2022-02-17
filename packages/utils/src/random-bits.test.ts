import "jest-extended";

import { randomBits } from "./random-bits";

describe("#randomBits", () => {
	it.each([
		[32, 8],
		[64, 16],
		[128, 32],
		[256, 64],
		[512, 128],
		[1024, 256],
		[2048, 512],
		[4096, 1024],
	])("should take %i bits and return a random hex string with a length of %i", (bits, expected) => {
		expect(randomBits(bits).toString("hex")).toHaveLength(expected);
	});
});
