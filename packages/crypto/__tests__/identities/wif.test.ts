import "jest-extended";

import { WIF } from "../../../../packages/crypto/source/identities/wif";
import { data, passphrase } from "./fixture.json";

describe("Identities - WIF", () => {
	describe("fromPassphrase", () => {
		it("should be OK", () => {
			expect(WIF.fromPassphrase(passphrase)).toBe(data.wif);
		});
	});
});
