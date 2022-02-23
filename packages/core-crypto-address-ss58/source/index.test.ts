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
					ss58: 0,
				},
			},
		});
	});

	it("should derive an address from an mnemonic (schnorr)", async (context) => {
		context.container.bind(BINDINGS.Identity.KeyPairFactory).to(Schnorr).inSingletonScope();

		assert.is(
			await context.container.resolve(AddressFactory).fromMnemonic(mnemonic),
			"16FXHyZ8GWJ3SV7gaDpmVkHoLnJzEDN3UjQAnriU6VAg4hNi",
		);
	});

	it("should derive an address from an mnemonic (secp256k1)", async (context) => {
		context.container.bind(BINDINGS.Identity.KeyPairFactory).to(ECDSA).inSingletonScope();

		assert.is(
			await context.container.resolve(AddressFactory).fromMnemonic(mnemonic),
			"1PcW4xBLRNvDufL5HpTqdT65HEjsPmFc3Z4ZdueNV3x8uVc2",
		);
	});

	it("should derive an address from a public key (schnorr)", async (context) => {
		context.container.bind(BINDINGS.Identity.KeyPairFactory).to(Schnorr).inSingletonScope();

		assert.is(
			await context.container
				.resolve(AddressFactory)
				.fromPublicKey(Buffer.from("e84093c072af70004a38dd95e34def119d2348d5261228175d032e5f2070e19f", "hex")),
			"16FXHyZ8GWJ3SV7gaDpmVkHoLnJzEDN3UjQAnriU6VAg4hNi",
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
			"1PcW4xBLRNvDufL5HpTqdT65HEjsPmFc3Z4ZdueNV3x8uVc2",
		);
	});

	it("should validate addresses", async (context) => {
		context.container.bind(BINDINGS.Identity.KeyPairFactory).to(ECDSA).inSingletonScope();

		assert.true(
			await context.container
				.resolve(AddressFactory)
				.validate("1PcW4xBLRNvDufL5HpTqdT65HEjsPmFc3Z4ZdueNV3x8uVc2"),
		);
		assert.true(
			await context.container
				.resolve(AddressFactory)
				.validate("1PcW4xBLRNvDufL5HpTqdT65HEjsPmFc3Z4ZdueNV3x8uVc2"),
		);
		assert.false(
			await context.container
				.resolve(AddressFactory)
				.validate("m0d1q05ypy7qw2hhqqz28rwetc6dauge6g6g65npy2qht5pjuheqwrse7gxkhwv"),
		);
	});
});
