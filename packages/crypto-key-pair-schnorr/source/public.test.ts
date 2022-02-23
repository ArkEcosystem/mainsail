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
			"e84093c072af70004a38dd95e34def119d2348d5261228175d032e5f2070e19f",
		);
	});

	it("should derive from a WIF", async (context) => {
		assert.is(
			await context.container
				.resolve(PublicKeyFactory)
				.fromWIF("KwDiBf89QgGbjEhKnhXJuH7LrciVrZi3qYjgd9M7rFU73sVHnoWn", 128),
			"79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798",
		);
	});

	it("should derive from a musig", async (context) => {
		assert.is(
			await context.container.resolve(PublicKeyFactory).fromMultiSignatureAsset({
				min: 3,
				publicKeys: [
					"4da006f958beba78ec54443df4a3f52237253f7ae8cbdb17dccf3feaa57f3126",
					"10c283aac7b35b4ae6fab201d36e8322c3408331149982e16013a5bcb917081c",
					"92a762e0123945455b7afe675e5ab98fb1586de43e5682514b9454d6edced724",
				],
			}),
			"e3106417650ee8dfda966fb4ad644d58f7389d2c33e4a887beafcbad18b31f18",
		);
	});

	each(
		"should pass with valid public keys",
		async ({ context, dataset }) => {
			assert.true(await context.container.resolve(PublicKeyFactory).verify(dataset));
		},
		[
			"4da006f958beba78ec54443df4a3f52237253f7ae8cbdb17dccf3feaa57f3126",
			"10c283aac7b35b4ae6fab201d36e8322c3408331149982e16013a5bcb917081c",
			"92a762e0123945455b7afe675e5ab98fb1586de43e5682514b9454d6edced724",
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
