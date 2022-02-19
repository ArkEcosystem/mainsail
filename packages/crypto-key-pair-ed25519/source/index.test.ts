import { describe } from "@arkecosystem/core-test-framework";

import { KeyPairFactory } from "./index";

const mnemonic =
	"question measure debris increase false feature journey height fun agent coach office only shell nation skill track upset distance behave easy devote floor shy";

describe("KeyPairFactory", ({ assert, it }) => {
	it("should derive a key pair from an mnemonic", async () => {
		assert.equal(await new KeyPairFactory().fromMnemonic(mnemonic), {
			publicKey: "b313202405b98459929b5dab9f46ce980dc2fdf0fad985aef7de848e0d2b5c97",
			privateKey: "aff34fe73a14920579944fcac68fe57a97bc9498fa530ab2411338b93a1244c5",
			compressed: true,
		});
	});

	it("should derive a key pair from an mnemonic", async () => {
		assert.equal(
			await new KeyPairFactory().fromPrivateKey(
				Buffer.from("aff34fe73a14920579944fcac68fe57a97bc9498fa530ab2411338b93a1244c5", "hex"),
			),
			{
				publicKey: "b313202405b98459929b5dab9f46ce980dc2fdf0fad985aef7de848e0d2b5c97",
				privateKey: "aff34fe73a14920579944fcac68fe57a97bc9498fa530ab2411338b93a1244c5",
				compressed: true,
			},
		);
	});
});
