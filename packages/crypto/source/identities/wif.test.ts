import { describe } from "@arkecosystem/core-test-framework";
import { WIF } from "./wif";
import { data, passphrase } from "../../test/identities/fixture.json";

describe("Identities - WIF", ({ it, assert }) => {
	it("fromPassphrase - should be OK", () => {
		assert.equal(WIF.fromPassphrase(passphrase), data.wif);
	});
});
