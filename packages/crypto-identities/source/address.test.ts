import "jest-extended";

import { data, passphrase } from "../test/identity.json";
import { devnet, mainnet } from "../test/networks.json";
import { Address } from "./address";
import { InvalidMultiSignatureAssetError, PublicKeyError } from "./errors";
import { Keys } from "./keys";
import { PublicKey } from "./public-key";

describe("Identities - Address", () => {
	describe("fromPassphrase", () => {
		it("should be OK", () => {
			expect(Address.fromPassphrase(passphrase, devnet)).toBe(data.address);
		});
	});

	describe("fromPublicKey", () => {
		it("should pass with a valid public key", () => {
			expect(Address.fromPublicKey(data.publicKey, devnet)).toBe(data.address);
		});

		it("should fail with an invalid public key", () => {
			expect(() => {
				Address.fromPublicKey("invalid", devnet);
			}).toThrow(PublicKeyError);
		});
	});

	describe("fromWIF", () => {
		it("should pass with a valid wif", () => {
			expect(Address.fromWIF(data.wif, devnet)).toBe(data.address);
		});

		it("should fail with an invalid wif", () => {
			expect(() => {
				Address.fromWIF("invalid", devnet);
			}).toThrow(Error);
		});
	});

	describe("fromMultiSignatureAddress", () => {
		it("should be ok", () => {
			expect(
				Address.fromMultiSignatureAsset(
					{
						min: 3,
						publicKeys: ["secret 1", "secret 2", "secret 3"].map((secret) =>
							PublicKey.fromPassphrase(secret),
						),
					},
					devnet,
				),
			).toBe("DMS861mLRrtH47QUMVif3C2rBCAdHbmwsi");
		});

		it("should create distinct addresses for different min", () => {
			const participants: string[] = [];
			const addresses = new Set();

			for (let i = 1; i < 16; i++) {
				participants.push(PublicKey.fromPassphrase(`secret ${i}`));
			}

			for (let i = 1; i < 16; i++) {
				addresses.add(
					Address.fromMultiSignatureAsset(
						{
							min: i,
							publicKeys: participants,
						},
						devnet,
					),
				);
			}

			expect([...addresses]).toHaveLength(15);
		});

		it("should fail with invalid input", () => {
			expect(() => {
				Address.fromMultiSignatureAsset(
					{
						min: 7,
						publicKeys: ["secret 1", "secret 2", "secret 3"].map((secret) =>
							PublicKey.fromPassphrase(secret),
						),
					},
					devnet,
				);
			}).toThrowError(InvalidMultiSignatureAssetError);

			expect(() => {
				Address.fromMultiSignatureAsset(
					{
						min: 1,
						publicKeys: [],
					},
					devnet,
				);
			}).toThrowError(InvalidMultiSignatureAssetError);

			expect(() => {
				Address.fromMultiSignatureAsset(
					{
						min: 1,
						publicKeys: ["garbage"],
					},
					devnet,
				);
			}).toThrowError(PublicKeyError);
		});
	});

	describe("fromPrivateKey", () => {
		it("should be OK", () => {
			expect(Address.fromPrivateKey(Keys.fromPassphrase(passphrase), devnet)).toBe(data.address);
		});
	});

	describe("toBuffer", () => {
		it("should be OK", () => {
			expect(Address.toBuffer("DMS861mLRrtH47QUMVif3C2rBCAdHbmwsi", devnet).addressError).toBeUndefined();
		});

		it("should not be OK", () => {
			expect(Address.toBuffer("AdVSe37niA3uFUPgCgMUH2tMsHF4LpLoiX", devnet).addressError).not.toBeUndefined();
		});
	});

	describe("fromBuffer", () => {
		it("should be OK", () => {
			const { addressBuffer } = Address.toBuffer("DMS861mLRrtH47QUMVif3C2rBCAdHbmwsi", devnet);
			expect(Address.fromBuffer(addressBuffer)).toEqual("DMS861mLRrtH47QUMVif3C2rBCAdHbmwsi");
		});
	});

	describe("validate", () => {
		it("should pass with a valid address", () => {
			expect(Address.validate(data.address, devnet)).toBeTrue();
		});

		it("should fail with an invalid address", () => {
			expect(Address.validate("invalid", devnet)).toBeFalse();
		});

		it("should validate MAINNET addresses", () => {
			expect(Address.validate("AdVSe37niA3uFUPgCgMUH2tMsHF4LpLoiX", mainnet)).toBeTrue();
		});

		it("should validate DEVNET addresses", () => {
			expect(Address.validate("DARiJqhogp2Lu6bxufUFQQMuMyZbxjCydN", devnet)).toBeTrue();
		});
	});
});
