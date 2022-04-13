import { describe } from "../../core-test-framework";

import { randomHex } from "./random-hex";

describe("#randomHex", ({ it, assert }) => {
	it("should return a random hex string", () => {
		assert.length(randomHex(8), 8);
		assert.length(randomHex(16), 16);
		assert.length(randomHex(32), 32);
	});
});
