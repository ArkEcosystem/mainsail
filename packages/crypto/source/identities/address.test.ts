import { PublicKey } from "../identities";
import { Errors } from "@arkecosystem/crypto-identities";
import { describe } from "@arkecosystem/core-test-framework";
import { Address } from "./address";
import { Keys } from "./keys";
import { configManager } from "../managers";
import { data, passphrase } from "../../test/identities/fixture.json";

describe<{
	config: any;
}>("Identities - Address", ({ it, beforeEach, afterEach, assert }) => {
	beforeEach((context) => {
		context.config = configManager.all();
	});

	afterEach((context) => configManager.setConfig(context.config));

	it("fromPassphrase - should be OK", () => {
		assert.equal(Address.fromPassphrase(passphrase), data.address);
	});

	it("fromPublicKey - should pass with a valid public key", () => {
		assert.equal(Address.fromPublicKey(data.publicKey), data.address);
	});

	it("fromPublicKey - should fail with an invalid public key", () => {
		assert.throws(
			() => {
				Address.fromPublicKey("invalid");
			},
			(err) => err instanceof Errors.PublicKeyError,
		);
	});

	it("fromWIF - should pass with a valid wif", () => {
		assert.equal(Address.fromWIF(data.wif), data.address);
	});

	it("fromWIF - should fail with an invalid wif", () => {
		assert.throws(() => {
			Address.fromWIF("invalid");
		});
	});

	it("fromMultiSignatureAddress - should be ok", () => {
		assert.equal(
			Address.fromMultiSignatureAsset({
				min: 3,
				publicKeys: ["secret 1", "secret 2", "secret 3"].map((secret) => PublicKey.fromPassphrase(secret)),
			}),
			"DMS861mLRrtH47QUMVif3C2rBCAdHbmwsi",
		);
	});

	it("fromMultiSignatureAddress - should create distinct addresses for different min", () => {
		const participants = [];
		const addresses = new Set();

		for (let i = 1; i < 16; i++) {
			participants.push(PublicKey.fromPassphrase(`secret ${i}`));
		}

		for (let i = 1; i < 16; i++) {
			addresses.add(
				Address.fromMultiSignatureAsset({
					min: i,
					publicKeys: participants,
				}),
			);
		}

		assert.length([...addresses], 15);
	});

	it("fromMultiSignatureAddress - should fail with invalid input", () => {
		assert.throws(
			() => {
				Address.fromMultiSignatureAsset({
					min: 7,
					publicKeys: ["secret 1", "secret 2", "secret 3"].map((secret) => PublicKey.fromPassphrase(secret)),
				});
			},
			(err) => err instanceof Errors.InvalidMultiSignatureAssetError,
		);

		assert.throws(
			() => {
				Address.fromMultiSignatureAsset({
					min: 1,
					publicKeys: [],
				});
			},
			(err) => err instanceof Errors.InvalidMultiSignatureAssetError,
		);

		assert.throws(
			() => {
				Address.fromMultiSignatureAsset({
					min: 1,
					publicKeys: ["garbage"],
				});
			},
			(err) => err instanceof Errors.PublicKeyError,
		);
	});

	it("fromPrivateKey - should be OK", () => {
		assert.equal(Address.fromPrivateKey(Keys.fromPassphrase(passphrase)), data.address);
	});

	it("toBuffer - should be OK", () => {
		assert.undefined(Address.toBuffer("DMS861mLRrtH47QUMVif3C2rBCAdHbmwsi").addressError);
	});

	it("toBuffer - should not be OK", () => {
		assert.defined(Address.toBuffer("AdVSe37niA3uFUPgCgMUH2tMsHF4LpLoiX").addressError);
	});

	it("fromBuffer - should be OK", () => {
		const { addressBuffer } = Address.toBuffer("DMS861mLRrtH47QUMVif3C2rBCAdHbmwsi");
		assert.equal(Address.fromBuffer(addressBuffer), "DMS861mLRrtH47QUMVif3C2rBCAdHbmwsi");
	});

	it("validate - should pass with a valid address", () => {
		assert.true(Address.validate(data.address));
	});

	it("validate - should fail with an invalid address", () => {
		assert.false(Address.validate("invalid"));
	});

	it("validate - should validate MAINNET addresses", () => {
		configManager.setConfig(configManager.getPreset("mainnet"));

		assert.true(Address.validate("AdVSe37niA3uFUPgCgMUH2tMsHF4LpLoiX"));
	});

	it("validate - should validate DEVNET addresses", () => {
		configManager.setConfig(configManager.getPreset("devnet"));

		assert.true(Address.validate("DARiJqhogp2Lu6bxufUFQQMuMyZbxjCydN"));
	});
});
