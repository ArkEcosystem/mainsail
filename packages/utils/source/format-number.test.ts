import { describe } from "../../core-test-framework";

import { formatNumber } from "./format-number";

describe("#formatNumber", ({ it, assert }) => {
	it("should format the given number", () => {
		assert.equal(formatNumber(123_456.789, "de-DE", { currency: "EUR", style: "currency" }), "123.456,79 €");
		assert.equal(formatNumber(123_456.789, "en-UK", { currency: "GBP", style: "currency" }), "£123,456.79");
		assert.equal(formatNumber(123_456.789, "jp-JP", { currency: "JPY", style: "currency" }), "¥123,457");
		assert.equal(formatNumber(123_456.789, "en-US", { maximumSignificantDigits: 3 }), "123,000");
	});
});
