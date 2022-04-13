import { describe } from "../../core-test-framework";

import { randomBits } from "./random-bits";

describe("#randomBits", ({ it, each, assert }) => {
	each(
		"should take %i bits and return a random hex string with a length of %i",
		({ dataset }) => {
			assert.length(randomBits(dataset[0]).toString("hex"), dataset[1]);
		},
		[
			[32, 8],
			[64, 16],
			[128, 32],
			[256, 64],
			[512, 128],
			[1024, 256],
			[2048, 512],
			[4096, 1024],
		],
	);
});
