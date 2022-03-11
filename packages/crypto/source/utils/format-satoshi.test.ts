import { SATOSHI } from "../constants";
import { BigNumber, formatSatoshi } from "../utils";
import { describe } from "@arkecosystem/core-test-framework";

describe("Format Satoshi", ({ it, assert }) => {
	it("should format satoshis", () => {
		assert.equal(formatSatoshi(BigNumber.make(SATOSHI)), "1 DѦ");
		assert.equal(formatSatoshi(BigNumber.make(0.1 * SATOSHI)), "0.1 DѦ");
		assert.equal(formatSatoshi(BigNumber.make((0.1 * SATOSHI).toString())), "0.1 DѦ");
		assert.equal(formatSatoshi(BigNumber.make(10)), "0.0000001 DѦ");
		assert.equal(formatSatoshi(BigNumber.make(SATOSHI + 10012)), "1.00010012 DѦ");
	});
});
