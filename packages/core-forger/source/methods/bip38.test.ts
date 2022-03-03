import { Identities } from "@arkecosystem/crypto";
import { describe } from "../../../core-test-framework/source";
import { BIP38 } from "./bip38";

import { dummy, expectedBlock, optionsDefault, transactions } from "../../test/create-block-with-transactions";

const passphrase: string = "clay harbor enemy utility margin pretty hub comic piece aerobic umbrella acquire";
const bip38: string = "6PYTQC4c2vBv6PGvV4HibNni6wNsHsGbR1qpL1DfkCNihsiWwXnjvJMU4B";

describe("Methods -> BIP38", ({ assert, it, spy }) => {
	it("should pass with a valid passphrase", () => {
		const delegate = new BIP38(bip38, "bip38-password");

		assert.is(delegate.publicKey, Identities.PublicKey.fromPassphrase(passphrase));
		assert.is(delegate.address, Identities.Address.fromPassphrase(passphrase));
	});

	it("should fail with an invalid passphrase", async () => {
		await assert.rejects(() => new BIP38(bip38, "invalid-password"));
	});

	it.skip("should forge a block - bip38", () => {
		const delegate = new BIP38(dummy.bip38Passphrase, "bip38-password");

		const spyDecryptKeys = spy(delegate, "decryptKeysWithOtp");
		const spyEncryptKeys = spy(delegate, "encryptKeysWithOtp");

		const block = delegate.forge(transactions, optionsDefault);

		spyDecryptKeys.calledTimes(1);
		spyEncryptKeys.calledTimes(1);

		for (const key of Object.keys(expectedBlock)) {
			assert.equal(block.data[key], expectedBlock[key]);
		}
		assert.equal(block.verification, {
			containsMultiSignatures: false,
			errors: [],
			verified: true,
		});
		assert.length(block.transactions, 50);
		assert.is(block.transactions[0].id, transactions[0].id);
	});

	it("should not forge a block if encryptedKeys are not set", async () => {
		const delegate = new BIP38(dummy.bip38Passphrase, "bip38-password");
		delegate.encryptedKeys = undefined;

		await assert.rejects(() => delegate.forge(transactions, optionsDefault));
	});
});
