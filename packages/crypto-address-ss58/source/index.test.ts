import { describe } from "@arkecosystem/core-test";
import { KeyPairFactory as Schnorr } from "@arkecosystem/crypto-key-pair-schnorr";
import { KeyPairFactory as Secp25k61 } from "@arkecosystem/crypto-key-pair-secp256k1";

import { AddressFactory } from "./index";

const mnemonic: string =
	"program fragile industry scare sun visit race erase daughter empty anxiety cereal cycle hunt airport educate giggle picture sunset apart jewel similar pulp moment";

describe("AddressFactory", ({ assert, it }) => {
	it("should derive an address from an mnemonic (schnorr)", async () => {
		assert.is(
			new AddressFactory({ addressHash: 0 }, new Schnorr()).fromMnemonic(mnemonic),
			"5HKE9eJ4Qj2Zzx7AcammMbTeVAKLXuouQEfgdZj7YQ99tN1U",
		);
	});

	it("should derive an address from an mnemonic (secp256k1)", async () => {
		assert.is(
			new AddressFactory({ addressHash: 0 }, new Secp25k61()).fromMnemonic(mnemonic),
			"KWDxqHwgJhad7Co3qiHDDeUYzGNHVWHPxCjYGcvVersEvsZwi",
		);
	});

	it("should derive an address from a public key (schnorr)", async () => {
		assert.is(
			new AddressFactory({ addressHash: 0 }, new Schnorr()).fromPublicKey(
				"e84093c072af70004a38dd95e34def119d2348d5261228175d032e5f2070e19f",
			),
			"5HKE9eJ4Qj2Zzx7AcammMbTeVAKLXuouQEfgdZj7YQ99tN1U",
		);
	});

	it("should derive an address from a public key (secp256k1)", async () => {
		assert.is(
			new AddressFactory({ addressHash: 0 }, new Secp25k61()).fromPublicKey(
				"03e84093c072af70004a38dd95e34def119d2348d5261228175d032e5f2070e19f",
			),
			"KWDxqHwgJhad7Co3qiHDDeUYzGNHVWHPxCjYGcvVersEvsZwi",
		);
	});

	it("should validate addresses", async () => {
		const factory = new AddressFactory({ addressHash: 0 }, new Secp25k61());

		assert.true(factory.validate("5HKE9eJ4Qj2Zzx7AcammMbTeVAKLXuouQEfgdZj7YQ99tN1U"));
		assert.true(factory.validate("KWDxqHwgJhad7Co3qiHDDeUYzGNHVWHPxCjYGcvVersEvsZwi"));
		assert.false(factory.validate("m0d1q05ypy7qw2hhqqz28rwetc6dauge6g6g65npy2qht5pjuheqwrse7gxkhwv"));
	});
});
