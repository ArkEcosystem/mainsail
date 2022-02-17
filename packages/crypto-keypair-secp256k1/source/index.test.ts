import { describe } from "@arkecosystem/core-test";

import { KeyPairFactory } from "./index";

const mnemonic: string =
    "program fragile industry scare sun visit race erase daughter empty anxiety cereal cycle hunt airport educate giggle picture sunset apart jewel similar pulp moment";

describe("KeyPairFactory", ({ assert, it }) => {
    it("should derive a key pair from an mnemonic", () => {
        assert.equal(new KeyPairFactory().fromMnemonic(mnemonic), {
            publicKey: "03e84093c072af70004a38dd95e34def119d2348d5261228175d032e5f2070e19f",
            privateKey: "814857ce48e291893feab95df02e1dbf7ad3994ba46f247f77e4eefd5d8734a2",
            compressed: true,
        });
    });

    it("should derive a key pair from an mnemonic", () => {
        assert.equal(
            new KeyPairFactory().fromPrivateKey("814857ce48e291893feab95df02e1dbf7ad3994ba46f247f77e4eefd5d8734a2"),
            {
                publicKey: "03e84093c072af70004a38dd95e34def119d2348d5261228175d032e5f2070e19f",
                privateKey: "814857ce48e291893feab95df02e1dbf7ad3994ba46f247f77e4eefd5d8734a2",
                compressed: true,
            },
        );
    });
});
