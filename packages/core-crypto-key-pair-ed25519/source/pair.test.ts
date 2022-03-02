import { Identifiers } from "@arkecosystem/core-contracts";
import { Configuration } from "@arkecosystem/core-crypto-config";
import { Container } from "@arkecosystem/core-kernel";
import { describe } from "../../core-test-framework/source";

import { KeyPairFactory } from "./pair";

const mnemonic =
	"question measure debris increase false feature journey height fun agent coach office only shell nation skill track upset distance behave easy devote floor shy";

describe<{ container: Container.Container }>("KeyPairFactory", ({ assert, beforeEach, it }) => {
	beforeEach((context) => {
		context.container = new Container.Container();
		context.container.bind(Identifiers.Cryptography.Configuration).to(Configuration).inSingletonScope();
	});

	it("should derive a key pair from an mnemonic", async (context) => {
		assert.equal(await context.container.resolve(KeyPairFactory).fromMnemonic(mnemonic), {
			compressed: true,
			privateKey: "aff34fe73a14920579944fcac68fe57a97bc9498fa530ab2411338b93a1244c5",
			publicKey: "b313202405b98459929b5dab9f46ce980dc2fdf0fad985aef7de848e0d2b5c97",
		});
	});

	it("should derive a key pair from an mnemonic", async (context) => {
		assert.equal(
			await context.container
				.resolve(KeyPairFactory)
				.fromPrivateKey(Buffer.from("aff34fe73a14920579944fcac68fe57a97bc9498fa530ab2411338b93a1244c5", "hex")),
			{
				compressed: true,
				privateKey: "aff34fe73a14920579944fcac68fe57a97bc9498fa530ab2411338b93a1244c5",
				publicKey: "b313202405b98459929b5dab9f46ce980dc2fdf0fad985aef7de848e0d2b5c97",
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
				publicKey: "4cb5abf6ad79fbf5abbccafcc269d85cd2651ed4b885b5869f241aedf0a5ba29",
			},
		);
	});
});
