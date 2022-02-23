import { Container } from "@arkecosystem/container";
import { describe } from "@arkecosystem/core-test-framework";
import { BINDINGS } from "@arkecosystem/crypto-contracts";

import { KeyPairFactory } from "./pair";
import { PublicKeyFactory } from "./public";

const mnemonic =
	"program fragile industry scare sun visit race erase daughter empty anxiety cereal cycle hunt airport educate giggle picture sunset apart jewel similar pulp moment";

describe<{ container: Container.Container }>("PrivateKeyFactory", ({ assert, beforeEach, it }) => {
	beforeEach((context) => {
		context.container = new Container.Container();
		context.container.bind(BINDINGS.Identity.KeyPairFactory).to(KeyPairFactory).inSingletonScope();
	});

	it("should derive a key pair from an mnemonic", async (context) => {
		assert.is(
			await context.container.resolve(PublicKeyFactory).fromMnemonic(mnemonic),
			"95af988701a6fb60e09da41d2ca1a9e0b49e43501bda4255b3ca01073f490c34102b6bbcafde6333185e9980745d72cb",
		);
	});

	it("should derive from a WIF", async (context) => {
		assert.is(
			await context.container
				.resolve(PublicKeyFactory)
				.fromWIF("KwDiBf89QgGbjEhKnhXJuH7LrciVrZi3qYjgd9M7rFU73sVHnoWn", 128),
			"97f1d3a73197d7942695638c4fa9ac0fc3688c4f9774b905a14e3a3f171bac586c55e83ff97a1aeffb3af00adb22c6bb",
		);
	});

	it("should derive from a musig", async (context) => {
		assert.is(
			await context.container.resolve(PublicKeyFactory).fromMultiSignatureAsset({
				min: 3,
				publicKeys: [
					"b79902f435d268d6d37ac3ab01f4536a86c192fa07ba5b63b5f8e4d0e05755cfeab9d35fbedb9c02919fe02a81f8b06d",
					"a80494fbe51f816f338146074af7ab070ee3f97e426b0d2c47718c3888d7e08ffd33abba7cff885191de2bf78b278dbb",
					"8c0550db8f2d646aabdf51115cada1e9b47b297cf3466ffb0b86327e5ab09be1c13bfe94d1066cb04187a820744dc1ab",
				],
			}),
			"a427f64357561bffc7f21693e5fbe5436d9cfdda7683fb64747f781481265c950ed3250f127b156342073d7619ba102b",
		);
	});

	// each(
	// 	"should pass with valid public keys",
	// 	async ({ dataset }) => {
	// 		assert.true(await context.container.resolve(PublicKeyFactory).verify(dataset));
	// 	},
	// 	[
	// 		"95af988701a6fb60e09da41d2ca1a9e0b49e43501bda4255b3ca01073f490c34102b6bbcafde6333185e9980745d72cb",
	// 		"97f1d3a73197d7942695638c4fa9ac0fc3688c4f9774b905a14e3a3f171bac586c55e83ff97a1aeffb3af00adb22c6bb",
	// 	],
	// );

	// each(
	// 	"should fail with invalid public keys",
	// 	async ({ dataset }) => {
	// 		assert.false(await context.container.resolve(PublicKeyFactory).verify(dataset));
	// 	},
	// 	[
	// 		"0",
	// 		"02b5Gf",
	// 		"NOT A VALID PUBLICKEY",
	// 		"000000000000000000000000000000000000000000000000000000000000000000",
	// 		"02b5Gf00d9de5a3ace28913fe78a15afcfe242926e94d9b517d06d2705b261f992",
	// 		"02e0f7449c5588f24492c338f2bc8f7865f755b958d48edb0f2d0056e50c3fd5b7",
	// 		"026f969d90fd494b04913eda9e0cf23f66eea5a70dfd5fb3e48f393397421c2b02",
	// 		"038c14b793cb19137e323a6d2e2a870bca2e7a493ec1153b3a95feb8a4873f8d08",
	// 		"32337416a26d8d49ec27059bd0589c49bb474029c3627715380f4df83fb431aece",
	// 		"22337416a26d8d49ec27059bd0589c49bb474029c3627715380f4df83fb431aece",
	// 	],
	// );
});
