import { Container } from "@arkecosystem/core-container";
import { Identifiers } from "@arkecosystem/core-contracts";
import { Configuration } from "@arkecosystem/core-crypto-config";

import { describe } from "../../core-test-framework/source";
import { KeyPairFactory } from "./pair";

const mnemonic =
	"question measure debris increase false feature journey height fun agent coach office only shell nation skill track upset distance behave easy devote floor shy";

describe<{ container: Container.Container }>("KeyPairFactory", ({ assert, beforeEach, it }) => {
	beforeEach((context) => {
		context.container = new Container();
		context.container.bind(Identifiers.Cryptography.Configuration).to(Configuration).inSingletonScope();
	});

	it("should derive a key pair from an mnemonic", async (context) => {
		assert.equal(await context.container.resolve(KeyPairFactory).fromMnemonic(mnemonic), {
			compressed: true,
			privateKey: "3e99d30b3816f60077b1fdb4535ce0e9f9c715e42d1647edc3361fc531fb618f",
			publicKey:
				"b4865127896c3c5286296a7b26e7c8002586a3ecf5832bfb59e689336f1f4c75e10491b9dfaed8dfb2c2fbe22d11fa93",
		});
	});

	it("should derive a key pair from an mnemonic", async (context) => {
		assert.equal(
			await context.container
				.resolve(KeyPairFactory)
				.fromPrivateKey(Buffer.from("3e99d30b3816f60077b1fdb4535ce0e9f9c715e42d1647edc3361fc531fb618f", "hex")),
			{
				compressed: true,
				privateKey: "3e99d30b3816f60077b1fdb4535ce0e9f9c715e42d1647edc3361fc531fb618f",
				publicKey:
					"b4865127896c3c5286296a7b26e7c8002586a3ecf5832bfb59e689336f1f4c75e10491b9dfaed8dfb2c2fbe22d11fa93",
			},
		);
	});

	it("should derive from a WIF", async (context) => {
		assert.equal(
			await context.container
				.resolve(KeyPairFactory)
				.fromWIF("KwDiBf89QgGbjEhKnhXJuH7LrciVrZi3qYjgd9M7rFU73sVHnoWn", 128),
			{
				compressed: true,
				privateKey: "0000000000000000000000000000000000000000000000000000000000000001",
				publicKey:
					"97f1d3a73197d7942695638c4fa9ac0fc3688c4f9774b905a14e3a3f171bac586c55e83ff97a1aeffb3af00adb22c6bb",
			},
		);
	});
});
