import { describe } from "@arkecosystem/core-test-framework";

import { Signature } from "./signature";

describe("Signature", ({ assert, it }) => {
	it("should sign and verify", async () => {
		assert.true(
			await new Signature().verify(
				Buffer.from(
					await new Signature().sign(
						Buffer.from("64726e3da8", "hex"),
						Buffer.from("67d53f170b908cabb9eb326c3c337762d59289a8fec79f7bc9254b584b73265c", "hex"),
					),
					"hex",
				),
				Buffer.from("64726e3da8", "hex"),
				Buffer.from(
					"a7e75af9dd4d868a41ad2f5a5b021d653e31084261724fb40ae2f1b1c31c778d3b9464502d599cf6720723ec5c68b59d",
					"hex",
				),
			),
		);
	});
});
