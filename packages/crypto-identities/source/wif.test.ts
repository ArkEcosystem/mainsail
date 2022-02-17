import "jest-extended";

import { data, passphrase } from "../test/identity.json";
import { devnet } from "../test/networks.json";
import { Keys } from "./keys";
import { WIF } from "./wif";

describe("Identities - WIF", () => {
	describe("fromPassphrase", () => {
		it("should be OK", () => {
			expect(WIF.fromPassphrase(passphrase, devnet)).toBe(data.wif);
		});
	});

	describe("fromKeys", () => {
		it("should be OK", () => {
			expect(WIF.fromKeys(Keys.fromPassphrase(passphrase), devnet)).toBe(data.wif);
		});
	});
});
