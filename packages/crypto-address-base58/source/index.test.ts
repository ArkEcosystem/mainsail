import { describe } from "@arkecosystem/core-test-framework";
import { KeyPairFactory as Schnorr } from "@arkecosystem/crypto-key-pair-schnorr-bcrypto";
import { KeyPairFactory as Secp25k61 } from "@arkecosystem/crypto-key-pair-secp256k1-bcrypto";

import { AddressFactory } from "./index";

const mnemonic =
	"program fragile industry scare sun visit race erase daughter empty anxiety cereal cycle hunt airport educate giggle picture sunset apart jewel similar pulp moment";

describe("AddressFactory", ({ assert, it }) => {
	it("should derive an address from an mnemonic (schnorr)", async () => {
		assert.is(
			await new AddressFactory(
				{
					pubKeyHash: 23,
				},
				new Schnorr(),
			).fromMnemonic(mnemonic),
			"AcYBXbtvzjYhRnNoJEC7E4ybnbkjrezbX8",
		);
	});

	it("should derive an address from an mnemonic (secp256k1)", async () => {
		assert.is(
			await new AddressFactory(
				{
					pubKeyHash: 23,
				},
				new Secp25k61(),
			).fromMnemonic(mnemonic),
			"AFsmMfUo2MrcwPnoF3Liqu36dSd3o8yYVu",
		);
	});

	it("should derive an address from a public key (schnorr)", async () => {
		assert.is(
			await new AddressFactory(
				{
					pubKeyHash: 23,
				},
				new Schnorr(),
			).fromPublicKey(Buffer.from("e84093c072af70004a38dd95e34def119d2348d5261228175d032e5f2070e19f", "hex")),
			"AcYBXbtvzjYhRnNoJEC7E4ybnbkjrezbX8",
		);
	});

	it("should derive an address from a public key (secp256k1)", async () => {
		assert.is(
			await new AddressFactory(
				{
					pubKeyHash: 23,
				},
				new Secp25k61(),
			).fromPublicKey(Buffer.from("03e84093c072af70004a38dd95e34def119d2348d5261228175d032e5f2070e19f", "hex")),
			"AFsmMfUo2MrcwPnoF3Liqu36dSd3o8yYVu",
		);
	});

	it("should validate addresses", async () => {
		const factory = new AddressFactory(
			{
				pubKeyHash: 23,
			},
			new Secp25k61(),
		);

		assert.true(await factory.validate("AFsmMfUo2MrcwPnoF3Liqu36dSd3o8yYVu"));
		assert.true(await factory.validate("AcYBXbtvzjYhRnNoJEC7E4ybnbkjrezbX8"));
		assert.false(await factory.validate("m0d1q05ypy7qw2hhqqz28rwetc6dauge6g6g65npy2qht5pjuheqwrse7gxkhwv"));
	});
});
