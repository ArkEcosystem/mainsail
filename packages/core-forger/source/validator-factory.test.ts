import { describe } from "../../core-test-framework/source";
import { Identities } from "@arkecosystem/crypto";
import { DelegateFactory } from "./delegate-factory";

const passphrase38: string = "clay harbor enemy utility margin pretty hub comic piece aerobic umbrella acquire";
const bip38: string = "6PYTQC4c2vBv6PGvV4HibNni6wNsHsGbR1qpL1DfkCNihsiWwXnjvJMU4B";
const passphrase39: string = "clay harbor enemy utility margin pretty hub comic piece aerobic umbrella acquire";

describe("DelegateFactory", ({ assert, it }) => {
	it("bip38 should create delegate with a valid bip38 passphrase", () => {
		const delegate = DelegateFactory.fromBIP38(bip38, "bip38-password");

		assert.equal(delegate.publicKey, Identities.PublicKey.fromPassphrase(passphrase38));
		assert.equal(delegate.address, Identities.Address.fromPassphrase(passphrase38));
	});

	it("bip38 should fail with an invalid passphrase", async () => {
		await assert.rejects(() => DelegateFactory.fromBIP38(bip38, "invalid-password"));
	});

	it("bip38 should fail with an invalid bip38", async () => {
		await assert.rejects(() => DelegateFactory.fromBIP38("wrong", "bip38-password"), "not bip38");
	});

	it("bip39 should be ok with a plain text passphrase", () => {
		const delegate = DelegateFactory.fromBIP39(passphrase39);

		assert.equal(delegate.publicKey, Identities.PublicKey.fromPassphrase(passphrase39));
		assert.equal(delegate.address, Identities.Address.fromPassphrase(passphrase39));
	});

	it("bip39 should throw if given a bip38 passphrase", async () => {
		await assert.rejects(() => DelegateFactory.fromBIP39(bip38), "seems to be bip38");
	});
});
