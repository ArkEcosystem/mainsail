import { describe } from "../../core-test-framework";

import { binary } from "./binary";

describe("#binary", ({ it, assert }) => {
	it("should encode the given string", () => {
		assert.equal(
			binary.encode("Hello World"),
			"1001000 1100101 1101100 1101100 1101111 100000 1010111 1101111 1110010 1101100 1100100",
		);
	});

	it("should decode the given string", () => {
		assert.equal(
			binary.decode("1001000 1100101 1101100 1101100 1101111 100000 1010111 1101111 1110010 1101100 1100100"),
			"Hello World",
		);
	});
});
