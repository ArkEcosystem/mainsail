import { describe } from "@arkecosystem/core-test";
import { KeyPairFactory as Schnorr } from "@arkecosystem/crypto-key-pair-schnorr";
import { KeyPairFactory as Secp25k61 } from "@arkecosystem/crypto-key-pair-secp256k1";

import { AddressFactory } from "./index";

const mnemonic =
	"program fragile industry scare sun visit race erase daughter empty anxiety cereal cycle hunt airport educate giggle picture sunset apart jewel similar pulp moment";

describe("AddressFactory", ({ assert, it }) => {
	it("should derive an address from an mnemonic (schnorr)", () => {
		assert.is(
			new AddressFactory(
				{
					pubKeyHash: 23,
				},
				new Schnorr(),
			).fromMnemonic(mnemonic),
			"AcYBXbtvzjYhRnNoJEC7E4ybnbkjrezbX8",
		);
	});

	it("should derive an address from an mnemonic (secp256k1)", () => {
		assert.is(
			new AddressFactory(
				{
					pubKeyHash: 23,
				},
				new Secp25k61(),
			).fromMnemonic(mnemonic),
			"AFsmMfUo2MrcwPnoF3Liqu36dSd3o8yYVu",
		);
	});

	it("should derive an address from a public key (schnorr)", () => {
		assert.is(
			new AddressFactory(
				{
					pubKeyHash: 23,
				},
				new Schnorr(),
			).fromPublicKey("e84093c072af70004a38dd95e34def119d2348d5261228175d032e5f2070e19f"),
			"AcYBXbtvzjYhRnNoJEC7E4ybnbkjrezbX8",
		);
	});

	it("should derive an address from a public key (secp256k1)", () => {
		assert.is(
			new AddressFactory(
				{
					pubKeyHash: 23,
				},
				new Secp25k61(),
			).fromPublicKey("03e84093c072af70004a38dd95e34def119d2348d5261228175d032e5f2070e19f"),
			"AFsmMfUo2MrcwPnoF3Liqu36dSd3o8yYVu",
		);
	});

	it("should validate addresses", () => {
		const factory = new AddressFactory(
			{
				pubKeyHash: 23,
			},
			new Secp25k61(),
		);

		assert.true(factory.validate("AFsmMfUo2MrcwPnoF3Liqu36dSd3o8yYVu"));
		assert.true(factory.validate("AcYBXbtvzjYhRnNoJEC7E4ybnbkjrezbX8"));
		assert.false(factory.validate("m0d1q05ypy7qw2hhqqz28rwetc6dauge6g6g65npy2qht5pjuheqwrse7gxkhwv"));
	});
});
