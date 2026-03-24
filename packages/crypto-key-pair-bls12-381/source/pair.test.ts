import { Application } from "@mainsail/kernel";
import { Identifiers } from "@mainsail/constants";
import { Configuration } from "@mainsail/crypto-config";
import { ServiceProvider as ValidationServiceProvider } from "@mainsail/validation";

import { describe } from "@mainsail/test-runner";
import { KeyPairFactory } from "./pair";

const mnemonic =
	"question measure debris increase false feature journey height fun agent coach office only shell nation skill track upset distance behave easy devote floor shy";

describe<{ app: Application; factory: KeyPairFactory }>("KeyPairFactory", ({ assert, beforeEach, it }) => {
	beforeEach(async (context) => {
		context.app = new Application();
		await context.app.resolve(ValidationServiceProvider).register();
		context.app.bind(Identifiers.Cryptography.Configuration).to(Configuration).inSingletonScope();

		context.factory = context.app.resolve(KeyPairFactory);
	});

	it("should derive a key pair from an mnemonic", async ({ factory }) => {
		assert.equal(await factory.fromMnemonic(mnemonic), {
			compressed: true,
			privateKey: "3e99d30b3816f60077b1fdb4535ce0e9f9c715e42d1647edc3361fc531fb618f",
			publicKey:
				"b4865127896c3c5286296a7b26e7c8002586a3ecf5832bfb59e689336f1f4c75e10491b9dfaed8dfb2c2fbe22d11fa93",
		});
	});

	it("should derive a key pair from an mnemonic", async ({ factory }) => {
		assert.equal(
			await factory.fromPrivateKey(
				Buffer.from("3e99d30b3816f60077b1fdb4535ce0e9f9c715e42d1647edc3361fc531fb618f", "hex"),
			),
			{
				compressed: true,
				privateKey: "3e99d30b3816f60077b1fdb4535ce0e9f9c715e42d1647edc3361fc531fb618f",
				publicKey:
					"b4865127896c3c5286296a7b26e7c8002586a3ecf5832bfb59e689336f1f4c75e10491b9dfaed8dfb2c2fbe22d11fa93",
			},
		);
	});

	it("should derive from a WIF", async ({ factory }) => {
		assert.equal(await factory.fromWIF("KwDiBf89QgGbjEhKnhXJuH7LrciVrZi3qYjgd9M7rFU73sVHnoWn"), {
			compressed: true,
			privateKey: "0000000000000000000000000000000000000000000000000000000000000001",
			publicKey:
				"97f1d3a73197d7942695638c4fa9ac0fc3688c4f9774b905a14e3a3f171bac586c55e83ff97a1aeffb3af00adb22c6bb",
		});
	});
});
