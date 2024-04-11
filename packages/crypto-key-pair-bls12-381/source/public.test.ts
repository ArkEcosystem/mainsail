import { Container } from "@mainsail/container";
import { Exceptions, Identifiers } from "@mainsail/contracts";
import { Configuration } from "@mainsail/crypto-config";

import { describe } from "../../test-framework/source";
import { KeyPairFactory } from "./pair";
import { PublicKeyFactory } from "./public";

const mnemonic =
	"program fragile industry scare sun visit race erase daughter empty anxiety cereal cycle hunt airport educate giggle picture sunset apart jewel similar pulp moment";

describe<{ container: Container }>("PublicKeyFactory", ({ assert, beforeEach, each, it }) => {
	beforeEach((context) => {
		context.container = new Container();
		context.container.bind(Identifiers.Cryptography.Configuration).to(Configuration).inSingletonScope();
		context.container.bind(Identifiers.Cryptography.Identity.KeyPair.Factory).to(KeyPairFactory).inSingletonScope();
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

	it("should throw not implemented exception when deriving from a musig", async (context) => {
		await assert.rejects(
			async () => context.container.resolve(PublicKeyFactory).fromMultiSignatureAsset({} as any),
			Exceptions.NotImplemented,
		);
	});

	each(
		"should pass with valid public keys",
		async ({ context, dataset }) => {
			assert.true(await context.container.resolve(PublicKeyFactory).verify(dataset));
		},
		[
			"95af988701a6fb60e09da41d2ca1a9e0b49e43501bda4255b3ca01073f490c34102b6bbcafde6333185e9980745d72cb",
			"97f1d3a73197d7942695638c4fa9ac0fc3688c4f9774b905a14e3a3f171bac586c55e83ff97a1aeffb3af00adb22c6bb",
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
