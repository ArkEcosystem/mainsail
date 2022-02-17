import "jest-extended";

import { data, passphrase } from "../test/identity.json";
import { devnet } from "../test/networks.json";
import { PrivateKey } from "./private-key";

describe("Identities - Private Key", () => {
	describe("fromPassphrase", () => {
		it("should be OK", () => {
			expect(PrivateKey.fromPassphrase(passphrase)).toBe(data.privateKey);
		});
	});

	describe("fromWIF", () => {
		it("should be OK", () => {
			expect(PrivateKey.fromWIF(data.wif, devnet)).toBe(data.privateKey);
		});
	});
});
