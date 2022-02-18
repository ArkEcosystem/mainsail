import { describe } from "@arkecosystem/core-test-framework";

import { KeyPairFactory } from "./index";

const mnemonic =
	"question measure debris increase false feature journey height fun agent coach office only shell nation skill track upset distance behave easy devote floor shy";

describe("KeyPairFactory", ({ assert, it }) => {
	it("should derive a key pair from an mnemonic", async () => {
		assert.equal(await new KeyPairFactory().fromMnemonic(mnemonic), {
			publicKey:
				"b4865127896c3c5286296a7b26e7c8002586a3ecf5832bfb59e689336f1f4c75e10491b9dfaed8dfb2c2fbe22d11fa93",
			privateKey: "3e99d30b3816f60077b1fdb4535ce0e9f9c715e42d1647edc3361fc531fb618f",
			compressed: true,
		});
	});

	it("should derive a key pair from an mnemonic", async () => {
		assert.equal(
			await new KeyPairFactory().fromPrivateKey(
				Buffer.from("3e99d30b3816f60077b1fdb4535ce0e9f9c715e42d1647edc3361fc531fb618f", "hex"),
			),
			{
				publicKey:
					"b4865127896c3c5286296a7b26e7c8002586a3ecf5832bfb59e689336f1f4c75e10491b9dfaed8dfb2c2fbe22d11fa93",
				privateKey: "3e99d30b3816f60077b1fdb4535ce0e9f9c715e42d1647edc3361fc531fb618f",
				compressed: true,
			},
		);
	});
});
