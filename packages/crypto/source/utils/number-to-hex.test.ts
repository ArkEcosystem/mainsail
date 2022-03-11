import { numberToHex } from "./";
import { describe } from "@arkecosystem/core-test-framework";

describe("NumberToHex", ({ it, assert }) => {
	it("should be ok", () => {
		assert.equal(numberToHex(10), "0a");
		assert.equal(numberToHex(1), "01");
		assert.equal(numberToHex(16), "10");
		assert.equal(numberToHex(16, 4), "0010");
	});
});
