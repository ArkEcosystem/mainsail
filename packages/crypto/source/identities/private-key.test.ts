import { describe } from "@arkecosystem/core-test-framework";
import { PrivateKey } from "./private-key";
import { data, passphrase } from "../../test/identities/fixture.json";

describe("Identities - Private Key", ({ it, assert }) => {
	it("fromPassphrase - should be OK", () => {
		assert.equal(PrivateKey.fromPassphrase(passphrase), data.privateKey);
	});

	it("fromWIF - should be OK", () => {
		assert.equal(PrivateKey.fromWIF(data.wif), data.privateKey);
	});
});
