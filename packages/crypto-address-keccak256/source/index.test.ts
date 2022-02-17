import { describe } from "@arkecosystem/core-test";
import { KeyPairFactory as Schnorr } from "@arkecosystem/crypto-key-pair-schnorr";
import { KeyPairFactory as Secp25k61 } from "@arkecosystem/crypto-key-pair-secp256k1";

import { AddressFactory } from "./index";

const mnemonic: string =
	"program fragile industry scare sun visit race erase daughter empty anxiety cereal cycle hunt airport educate giggle picture sunset apart jewel similar pulp moment";

describe("AddressFactory", ({ assert, it }) => {
	it("should derive an address from an mnemonic (schnorr)", () => {
		assert.is(
			new AddressFactory({}, new Schnorr()).fromMnemonic(mnemonic),
			"0x4D9AED240463043cFcf5B5Df16b9ad523930A181",
		);
	});

	it("should derive an address from an mnemonic (secp256k1)", () => {
		assert.is(
			new AddressFactory({}, new Secp25k61()).fromMnemonic(mnemonic),
			"0xC7C50f33278bDe272ffe23865fF9fBd0155a5175",
		);
	});

	it("should derive an address from a public key (schnorr)", () => {
		assert.is(
			new AddressFactory({}, new Schnorr()).fromPublicKey(
				"e84093c072af70004a38dd95e34def119d2348d5261228175d032e5f2070e19f",
			),
			"0x4D9AED240463043cFcf5B5Df16b9ad523930A181",
		);
	});

	it("should derive an address from a public key (secp256k1)", () => {
		assert.is(
			new AddressFactory({}, new Secp25k61()).fromPublicKey(
				"03e84093c072af70004a38dd95e34def119d2348d5261228175d032e5f2070e19f",
			),
			"0xC7C50f33278bDe272ffe23865fF9fBd0155a5175",
		);
	});

	it("should validate addresses", () => {
		const factory = new AddressFactory({}, new Secp25k61());

		assert.true(factory.validate("0x4D9AED240463043cFcf5B5Df16b9ad523930A181"));
		assert.true(factory.validate("0xC7C50f33278bDe272ffe23865fF9fBd0155a5175"));
		assert.false(factory.validate("m0d1q05ypy7qw2hhqqz28rwetc6dauge6g6g65npy2qht5pjuheqwrse7gxkhwv"));
	});
});
