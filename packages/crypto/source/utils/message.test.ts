import { Message } from "../crypto";
import { describe } from "@arkecosystem/core-test-framework";

const fixture = {
	data: {
		publicKey: "034151a3ec46b5670a682b0a63394f863587d1bc97483b1b6c70eb58e7f0aed192",
		signature:
			"304402200fb4adddd1f1d652b544ea6ab62828a0a65b712ed447e2538db0caebfa68929e02205ecb2e1c63b29879c2ecf1255db506d671c8b3fa6017f67cfd1bf07e6edd1cc8",
		message: "Hello World",
	},
	passphrase: "this is a top secret passphrase",
};

describe("Message", ({ it, assert }) => {
	it("sign should be ok", () => {
		const actual = Message.sign(fixture.data.message, fixture.passphrase);

		assert.true(actual.hasOwnProperty("publicKey"));
		assert.true(actual.hasOwnProperty("signature"));
		assert.true(actual.hasOwnProperty("message"));
		assert.true(Message.verify(actual));
	});

	it("verify should be ok", () => {
		assert.true(Message.verify(fixture.data));
	});
});
