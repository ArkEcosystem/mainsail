import { describe } from "../../core-test-framework";

import { randomBase64 } from "./random-base64";

describe("#randomBase64", ({ it, assert }) => {
	it("should return a random base64 string", () => {
		assert.length(randomBase64(8), 8);
		assert.length(randomBase64(16), 16);
		assert.length(randomBase64(32), 32);
	});
});
