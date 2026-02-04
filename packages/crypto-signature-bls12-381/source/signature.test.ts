import { describe } from "@mainsail/test-runner";
import { Application } from "@mainsail/kernel";
import { Signature } from "./signature";
import { NotImplemented } from "@mainsail/exceptions";


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

	it("#signRecoverable - should throw not implemented", async ({ signature }) => {
		await assert.rejects(() => signature.signRecoverable(Buffer.from(""), Buffer.from("")), NotImplemented);
	});

	it("#verifyRecoverable - should throw not implemented", async ({ signature }) => {
		await assert.rejects(() => signature.verifyRecoverable({ r: "", s: "", v: 0 }, Buffer.from(""), Buffer.from("")), NotImplemented);
	});

	it("#recoverPublicKey - should throw not implemented", async ({ signature }) => {
		await assert.rejects(() => signature.recoverPublicKey(Buffer.from(""), { r: "", s: "", v: 0 }), NotImplemented);
	});
});
