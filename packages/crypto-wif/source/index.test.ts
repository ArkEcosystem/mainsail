import "jest-extended";

import { data, mnemonic } from "../test/identity.json";
import { devnet } from "../test/networks.json";
import { Keys } from "./keys";
import { WIF } from "./wif";

describe("Identities - WIF", () => {
	describe("fromMnemonic", () => {
		it("should be OK", () => {
			expect(WIF.fromMnemonic(mnemonic, devnet)).toBe(data.wif);
		});
	});

	describe("fromKeys", () => {
		it("should be OK", () => {
			expect(WIF.fromKeys(Keys.fromMnemonic(mnemonic), devnet)).toBe(data.wif);
		});
	});
});
