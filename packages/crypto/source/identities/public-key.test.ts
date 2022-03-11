import { describe } from "@arkecosystem/core-test-framework";
import { Errors } from "@arkecosystem/crypto-identities";
import { PublicKey } from "./public-key";
import { data, passphrase } from "../../test/identities/fixture.json";

const publicKeys = {
	valid: [
		data.publicKey,
		"02b54f00d9de5a3ace28913fe78a15afcfe242926e94d9b517d06d2705b261f992",
		"03b906102928cf97c6ddeb59cefb0e1e02105a22ab1acc3b4906214a16d494db0a",
		"0235d486fea0193cbe77e955ab175b8f6eb9eaf784de689beffbd649989f5d6be3",
		"03a46f2547d20b47003c1c376788db5a54d67264df2ae914f70bf453b6a1fa1b3a",
		"03d7dfe44e771039334f4712fb95ad355254f674c8f5d286503199157b7bf7c357",
		"0279f05076556da7173610a7676399c3620276ebbf8c67552ad3b1f26ec7627794",
		"03c075494ad044ab8c0b2dc7ccd19f649db844a4e558e539d3ac2610c4b90a5139",
		"03aa98d2a27ef50e34f6882a089d0915edc0d21c2c7eedc9bf3323f8ca8c260531",
		"02d113acc492f613cfed6ec60fe31d0d0c1aa9787122070fb8dd76baf27f7a4766",
	],
	invalid: [
		"0",
		"02b5Gf",
		"NOT A VALID PUBLICKEY",
		"000000000000000000000000000000000000000000000000000000000000000000",
		"02b5Gf00d9de5a3ace28913fe78a15afcfe242926e94d9b517d06d2705b261f992",
		"02e0f7449c5588f24492c338f2bc8f7865f755b958d48edb0f2d0056e50c3fd5b7",
		"026f969d90fd494b04913eda9e0cf23f66eea5a70dfd5fb3e48f393397421c2b02",
		"038c14b793cb19137e323a6d2e2a870bca2e7a493ec1153b3a95feb8a4873f8d08",
		"32337416a26d8d49ec27059bd0589c49bb474029c3627715380f4df83fb431aece",
		"22337416a26d8d49ec27059bd0589c49bb474029c3627715380f4df83fb431aece",
	],
};

describe("Identities - Public Key", ({ it, assert }) => {
	it("fromPassphrase - should be OK", () => {
		assert.equal(PublicKey.fromPassphrase(passphrase), data.publicKey);
	});

	it("fromWIF - should be OK", () => {
		assert.equal(PublicKey.fromWIF(data.wif), data.publicKey);
	});

	it("fromMultiSignatureAddress - should be ok", () => {
		assert.equal(
			PublicKey.fromMultiSignatureAsset({
				min: 3,
				publicKeys: ["secret 1", "secret 2", "secret 3"].map((secret) => PublicKey.fromPassphrase(secret)),
			}),
			"0279f05076556da7173610a7676399c3620276ebbf8c67552ad3b1f26ec7627794",
		);
	});

	it("fromMultiSignatureAddress - should create the same public key for all permutations", () => {
		const publicKeySet = new Set();

		const permutations = [
			[
				"0235d486fea0193cbe77e955ab175b8f6eb9eaf784de689beffbd649989f5d6be3",
				"03a46f2547d20b47003c1c376788db5a54d67264df2ae914f70bf453b6a1fa1b3a",
				"03d7dfe44e771039334f4712fb95ad355254f674c8f5d286503199157b7bf7c357",
			],
			[
				"0235d486fea0193cbe77e955ab175b8f6eb9eaf784de689beffbd649989f5d6be3",
				"03d7dfe44e771039334f4712fb95ad355254f674c8f5d286503199157b7bf7c357",
				"03a46f2547d20b47003c1c376788db5a54d67264df2ae914f70bf453b6a1fa1b3a",
			],
			[
				"03a46f2547d20b47003c1c376788db5a54d67264df2ae914f70bf453b6a1fa1b3a",
				"0235d486fea0193cbe77e955ab175b8f6eb9eaf784de689beffbd649989f5d6be3",
				"03d7dfe44e771039334f4712fb95ad355254f674c8f5d286503199157b7bf7c357",
			],
			[
				"03a46f2547d20b47003c1c376788db5a54d67264df2ae914f70bf453b6a1fa1b3a",
				"03d7dfe44e771039334f4712fb95ad355254f674c8f5d286503199157b7bf7c357",
				"0235d486fea0193cbe77e955ab175b8f6eb9eaf784de689beffbd649989f5d6be3",
			],
			[
				"03d7dfe44e771039334f4712fb95ad355254f674c8f5d286503199157b7bf7c357",
				"03a46f2547d20b47003c1c376788db5a54d67264df2ae914f70bf453b6a1fa1b3a",
				"0235d486fea0193cbe77e955ab175b8f6eb9eaf784de689beffbd649989f5d6be3",
			],
			[
				"03d7dfe44e771039334f4712fb95ad355254f674c8f5d286503199157b7bf7c357",
				"0235d486fea0193cbe77e955ab175b8f6eb9eaf784de689beffbd649989f5d6be3",
				"03a46f2547d20b47003c1c376788db5a54d67264df2ae914f70bf453b6a1fa1b3a",
			],
		];

		permutations.forEach((publicKeys) => {
			publicKeySet.add(
				PublicKey.fromMultiSignatureAsset({
					min: 2,
					publicKeys,
				}),
			);
		});

		assert.length([...publicKeySet], 1);
	});

	it("fromMultiSignatureAddress - should create distinct public keys for different min", () => {
		const participants = [];
		const publicKeys = new Set();

		for (let i = 1; i < 16; i++) {
			participants.push(PublicKey.fromPassphrase(`secret ${i}`));
		}

		for (let i = 1; i < 16; i++) {
			publicKeys.add(
				PublicKey.fromMultiSignatureAsset({
					min: i,
					publicKeys: participants,
				}),
			);
		}

		assert.length([...publicKeys], 15);
	});

	it("fromMultiSignatureAddress - should fail with invalid input", () => {
		assert.throws(
			() => {
				PublicKey.fromMultiSignatureAsset({
					min: 7,
					publicKeys: ["secret 1", "secret 2", "secret 3"].map((secret) => PublicKey.fromPassphrase(secret)),
				});
			},
			(err) => err instanceof Errors.InvalidMultiSignatureAssetError,
		);

		assert.throws(
			() => {
				PublicKey.fromMultiSignatureAsset({
					min: 1,
					publicKeys: [],
				});
			},
			(err) => err instanceof Errors.InvalidMultiSignatureAssetError,
		);

		assert.throws(
			() => {
				PublicKey.fromMultiSignatureAsset({
					min: 1,
					publicKeys: ["garbage"],
				});
			},
			(err) => err instanceof Errors.PublicKeyError,
		);
	});

	it("verify - should pass with valid public keys", () => {
		publicKeys.valid.forEach((publicKey) => {
			assert.true(PublicKey.verify(publicKey));
		});
	});

	it("verify - should fail with invalid public keys", () => {
		publicKeys.invalid.forEach((publicKey) => {
			assert.false(PublicKey.verify(publicKey));
		});
	});
});
