import { Container } from "@arkecosystem/container";
import { describe } from "@arkecosystem/core-test-framework";
import { BINDINGS, IConfiguration } from "@arkecosystem/core-crypto-contracts";
import { Configuration } from "@arkecosystem/core-crypto-config";
import { KeyPairFactory as ECDSA } from "@arkecosystem/core-crypto-key-pair-ecdsa";
import { KeyPairFactory as Schnorr } from "@arkecosystem/core-crypto-key-pair-schnorr";

import { AddressFactory } from "./index";

const mnemonic =
	"program fragile industry scare sun visit race erase daughter empty anxiety cereal cycle hunt airport educate giggle picture sunset apart jewel similar pulp moment";

describe<{ container: Container.Container }>("AddressFactory", ({ assert, beforeEach, it }) => {
	beforeEach((context) => {
		context.container = new Container.Container();
		context.container.bind(BINDINGS.Configuration).to(Configuration).inSingletonScope();

		context.container.get<IConfiguration>(BINDINGS.Configuration).setConfig({
			milestones: [],
			network: {
				// @ts-ignore
				address: {
					bech32m: "mod",
				},
			},
		});
	});

	it("should derive an address from an mnemonic (schnorr)", async (context) => {
		context.container.bind(BINDINGS.Identity.KeyPairFactory).to(Schnorr).inSingletonScope();

		assert.is(
			await context.container.resolve(AddressFactory).fromMnemonic(mnemonic),
			"mod1apqf8srj4acqqj3cmk27xn00zxwjxjx4ycfzs96aqvh97grsux0sj0q2ep",
		);
	});

	it("should derive an address from an mnemonic (secp256k1)", async (context) => {
		context.container.bind(BINDINGS.Identity.KeyPairFactory).to(ECDSA).inSingletonScope();

		assert.is(
			await context.container.resolve(AddressFactory).fromMnemonic(mnemonic),
			"mod1q05ypy7qw2hhqqz28rwetc6dauge6g6g65npy2qht5pjuheqwrse7a6xmtw",
		);
	});

	it("should derive an address from a public key (schnorr)", async (context) => {
		context.container.bind(BINDINGS.Identity.KeyPairFactory).to(Schnorr).inSingletonScope();

		assert.is(
			await context.container
				.resolve(AddressFactory)
				.fromPublicKey(Buffer.from("e84093c072af70004a38dd95e34def119d2348d5261228175d032e5f2070e19f", "hex")),
			"mod1apqf8srj4acqqj3cmk27xn00zxwjxjx4ycfzs96aqvh97grsux0sj0q2ep",
		);
	});

	it("should derive an address from a public key (secp256k1)", async (context) => {
		context.container.bind(BINDINGS.Identity.KeyPairFactory).to(ECDSA).inSingletonScope();

		assert.is(
			await context.container
				.resolve(AddressFactory)
				.fromPublicKey(
					Buffer.from("03e84093c072af70004a38dd95e34def119d2348d5261228175d032e5f2070e19f", "hex"),
				),
			"mod1q05ypy7qw2hhqqz28rwetc6dauge6g6g65npy2qht5pjuheqwrse7a6xmtw",
		);
	});

	it("should validate addresses", async (context) => {
		context.container.bind(BINDINGS.Identity.KeyPairFactory).to(ECDSA).inSingletonScope();

		assert.true(
			await context.container
				.resolve(AddressFactory)
				.validate("mod1q05ypy7qw2hhqqz28rwetc6dauge6g6g65npy2qht5pjuheqwrse7a6xmtw"),
		);
		assert.true(
			await context.container
				.resolve(AddressFactory)
				.validate("mod1apqf8srj4acqqj3cmk27xn00zxwjxjx4ycfzs96aqvh97grsux0sj0q2ep"),
		);
		assert.false(
			await context.container
				.resolve(AddressFactory)
				.validate("m0d1q05ypy7qw2hhqqz28rwetc6dauge6g6g65npy2qht5pjuheqwrse7gxkhwv"),
		);
	});
});
