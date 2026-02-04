import { describe } from "@mainsail/test-runner";
import { Application } from "@mainsail/kernel";
import { Signature } from "./signature";

describe<{
	app: Application;
	signature: Signature;
}>("Signature", ({ beforeEach, assert, it }) => {
	beforeEach((context) => {
		context.app = new Application();

		context.signature = context.app.resolve(Signature);
	});

	it("should sign and verify", async ({ signature }) => {
		assert.true(
			await signature.verify(
				Buffer.from(
					await signature.sign(
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
