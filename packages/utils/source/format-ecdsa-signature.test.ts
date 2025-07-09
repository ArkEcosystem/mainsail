import { describe } from "../../test-framework/source";
import { formatEcdsaSignature } from "./format-ecdsa-signature.js";

describe("#formatEcdsaSignature", ({ it, assert }) => {
	it("should format the given r,s,v values", () => {
		assert.equal(
			formatEcdsaSignature(
				"7a4813b2231f17d1485bf6843b32d6cf7f965eeaa90837c1fb376bab7d0ed36a",
				"4b63bda8604dc026c29677549a815ebf15dca82ea0bcb5f53f9288664be839bd",
				0,
			),
			"7a4813b2231f17d1485bf6843b32d6cf7f965eeaa90837c1fb376bab7d0ed36a4b63bda8604dc026c29677549a815ebf15dca82ea0bcb5f53f9288664be839bd00",
		);

		assert.equal(
			formatEcdsaSignature(
				"7a4813b2231f17d1485bf6843b32d6cf7f965eeaa90837c1fb376bab7d0ed36a",
				"4b63bda8604dc026c29677549a815ebf15dca82ea0bcb5f53f9288664be839bd",
				27,
			),
			"7a4813b2231f17d1485bf6843b32d6cf7f965eeaa90837c1fb376bab7d0ed36a4b63bda8604dc026c29677549a815ebf15dca82ea0bcb5f53f9288664be839bd1b",
		);
	});
});
