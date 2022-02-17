import { describe } from "@arkecosystem/core-test";
import { KeyPairFactory as Schnorr } from "@arkecosystem/crypto-keypair-schnorr";
import { KeyPairFactory as Secp25k61 } from "@arkecosystem/crypto-keypair-secp256k1";

import { AddressFactory } from "./index";

const mnemonic: string =
    "program fragile industry scare sun visit race erase daughter empty anxiety cereal cycle hunt airport educate giggle picture sunset apart jewel similar pulp moment";

describe("AddressFactory", ({ assert, it }) => {
    it("should derive an address from an mnemonic (schnorr)", () => {
        assert.is(
            new AddressFactory(
                {
                    prefix: "mod",
                },
                new Schnorr(),
            ).fromMnemonic(mnemonic),
            "mod1apqf8srj4acqqj3cmk27xn00zxwjxjx4ycfzs96aqvh97grsux0sj0q2ep",
        );
    });

    it("should derive an address from an mnemonic (secp256k1)", () => {
        assert.is(
            new AddressFactory(
                {
                    prefix: "mod",
                },
                new Secp25k61(),
            ).fromMnemonic(mnemonic),
            "mod1q05ypy7qw2hhqqz28rwetc6dauge6g6g65npy2qht5pjuheqwrse7a6xmtw",
        );
    });

    it("should derive an address from a public key (schnorr)", () => {
        assert.is(
            new AddressFactory(
                {
                    prefix: "mod",
                },
                new Schnorr(),
            ).fromPublicKey("e84093c072af70004a38dd95e34def119d2348d5261228175d032e5f2070e19f"),
            "mod1apqf8srj4acqqj3cmk27xn00zxwjxjx4ycfzs96aqvh97grsux0sj0q2ep",
        );
    });

    it("should derive an address from a public key (secp256k1)", () => {
        assert.is(
            new AddressFactory(
                {
                    prefix: "mod",
                },
                new Secp25k61(),
            ).fromPublicKey("03e84093c072af70004a38dd95e34def119d2348d5261228175d032e5f2070e19f"),
            "mod1q05ypy7qw2hhqqz28rwetc6dauge6g6g65npy2qht5pjuheqwrse7a6xmtw",
        );
    });

    it("should validate addresses", () => {
        const factory = new AddressFactory(
            {
                prefix: "mod",
            },
            new Secp25k61(),
        );

        assert.true(factory.validate("mod1q05ypy7qw2hhqqz28rwetc6dauge6g6g65npy2qht5pjuheqwrse7a6xmtw"));
        assert.true(factory.validate("mod1apqf8srj4acqqj3cmk27xn00zxwjxjx4ycfzs96aqvh97grsux0sj0q2ep"));
        assert.false(factory.validate("m0d1q05ypy7qw2hhqqz28rwetc6dauge6g6g65npy2qht5pjuheqwrse7gxkhwv"));
    });
});
