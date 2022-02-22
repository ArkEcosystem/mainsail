import { describe } from "@arkecosystem/core-test-framework";

import { KeyPairFactory } from "./pair";

const mnemonic =
	"program fragile industry scare sun visit race erase daughter empty anxiety cereal cycle hunt airport educate giggle picture sunset apart jewel similar pulp moment";

describe("KeyPairFactory", ({ assert, it }) => {
	it("should derive a key pair from an mnemonic", async () => {
		assert.equal(await new KeyPairFactory().fromMnemonic(mnemonic), {
			compressed: true,
			privateKey: "814857ce48e291893feab95df02e1dbf7ad3994ba46f247f77e4eefd5d8734a2",
			publicKey: "03e84093c072af70004a38dd95e34def119d2348d5261228175d032e5f2070e19f",
		});
	});

	it("should derive a key pair from an mnemonic", async () => {
		assert.equal(
			await new KeyPairFactory().fromPrivateKey(
				Buffer.from("814857ce48e291893feab95df02e1dbf7ad3994ba46f247f77e4eefd5d8734a2", "hex"),
			),
			{
				compressed: true,
				privateKey: "814857ce48e291893feab95df02e1dbf7ad3994ba46f247f77e4eefd5d8734a2",
				publicKey: "03e84093c072af70004a38dd95e34def119d2348d5261228175d032e5f2070e19f",
			},
		);
	});

	it("should derive from a WIF", async () => {
		assert.equal(await new KeyPairFactory().fromWIF("KwDiBf89QgGbjEhKnhXJuH7LrciVrZi3qYjgd9M7rFU73sVHnoWn", 128), {
			compressed: true,
			privateKey: "0000000000000000000000000000000000000000000000000000000000000001",
			publicKey: "0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798",
		});
	});
});
