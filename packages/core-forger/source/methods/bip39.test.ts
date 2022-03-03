import { BIP39 } from "./bip39";
import { Identities } from "@arkecosystem/crypto";
import { describe } from "../../../core-test-framework/source";

import { dummy, optionsDefault, transactions } from "../../test/create-block-with-transactions";

const passphrase: string = "clay harbor enemy utility margin pretty hub comic piece aerobic umbrella acquire";

describe("Methods -> BIP39", ({ assert, it }) => {
	it("should be ok with a plain text passphrase", () => {
		const delegate = new BIP39(passphrase);

		assert.is(delegate.publicKey, Identities.PublicKey.fromPassphrase(passphrase));
		assert.is(delegate.address, Identities.Address.fromPassphrase(passphrase));
	});

	it.skip("should forge a block", () => {
		const delegate: BIP39 = new BIP39(dummy.plainPassphrase);

		const block = delegate.forge(transactions, optionsDefault);

		assert.equal(block.verification, {
			containsMultiSignatures: false,
			errors: [],
			verified: true,
		});
		assert.length(block.transactions, 50);
		assert.is(block.transactions[0].id, transactions[0].id);
	});
});
