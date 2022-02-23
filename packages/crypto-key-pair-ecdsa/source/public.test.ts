import { Container } from "@arkecosystem/container";
import { describe } from "@arkecosystem/core-test-framework";
import { BINDINGS } from "@arkecosystem/crypto-contracts";

import { KeyPairFactory } from "./pair";
import { PublicKeyFactory } from "./public";

const mnemonic =
	"program fragile industry scare sun visit race erase daughter empty anxiety cereal cycle hunt airport educate giggle picture sunset apart jewel similar pulp moment";

describe<{ container: Container.Container }>("PrivateKeyFactory", ({ assert, beforeEach, each, it }) => {
	beforeEach((context) => {
		context.container = new Container.Container();
		context.container.bind(BINDINGS.Identity.KeyPairFactory).to(KeyPairFactory).inSingletonScope();
	});

	it("should derive a key pair from an mnemonic", async (context) => {
		assert.is(
			await context.container.resolve(PublicKeyFactory).fromMnemonic(mnemonic),
			"03e84093c072af70004a38dd95e34def119d2348d5261228175d032e5f2070e19f",
		);
	});

	it("should derive from a WIF", async (context) => {
		assert.is(
			await context.container
				.resolve(PublicKeyFactory)
				.fromWIF("KwDiBf89QgGbjEhKnhXJuH7LrciVrZi3qYjgd9M7rFU73sVHnoWn", 128),
			"0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798",
		);
	});

	it("should derive from a musig", async (context) => {
		assert.is(
			await context.container.resolve(PublicKeyFactory).fromMultiSignatureAsset({
				min: 3,
				publicKeys: [
					"0235d486fea0193cbe77e955ab175b8f6eb9eaf784de689beffbd649989f5d6be3",
					"03a46f2547d20b47003c1c376788db5a54d67264df2ae914f70bf453b6a1fa1b3a",
					"03d7dfe44e771039334f4712fb95ad355254f674c8f5d286503199157b7bf7c357",
				],
			}),
			"0321d8b4df000280dd7f3ac8dae0558e214bd6fe736d97cf68ea8a083c024c249c",
		);
	});

	each(
		"should pass with valid public keys",
		async ({ context, dataset }) => {
			assert.true(await context.container.resolve(PublicKeyFactory).verify(dataset));
		},
		[
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
	);

	each(
		"should fail with invalid public keys",
		async ({ context, dataset }) => {
			assert.false(await context.container.resolve(PublicKeyFactory).verify(dataset));
		},
		[
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
	);
});
