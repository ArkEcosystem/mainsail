import { Container } from "@arkecosystem/core-container";
import { Crypto, Identifiers } from "@arkecosystem/core-contracts";
import { Configuration } from "@arkecosystem/core-crypto-config";
import { ServiceProvider as ECDSA } from "@arkecosystem/core-crypto-key-pair-ecdsa";
import { ServiceProvider as Schnorr } from "@arkecosystem/core-crypto-key-pair-schnorr";
import { Application } from "@arkecosystem/core-kernel";

import { describe } from "../../core-test-framework/source";
import { AddressFactory } from "./address.factory";

const mnemonic =
	"program fragile industry scare sun visit race erase daughter empty anxiety cereal cycle hunt airport educate giggle picture sunset apart jewel similar pulp moment";

describe<{ app: Application }>("AddressFactory", ({ assert, beforeEach, it }) => {
	beforeEach((context) => {
		context.app = new Application(new Container());
		context.app.bind(Identifiers.Cryptography.Configuration).to(Configuration).inSingletonScope();

		context.app.get<Crypto.IConfiguration>(Identifiers.Cryptography.Configuration).setConfig({
			milestones: [
				{
					address: {
						bech32: "mod",
					},
				},
			],
		});
	});

	it("should derive an address from an mnemonic (schnorr)", async (context) => {
		await context.app.resolve<Schnorr>(Schnorr).register();

		assert.is(
			await context.app.resolve(AddressFactory).fromMnemonic(mnemonic),
			"mod1apqf8srj4acqqj3cmk27xn00zxwjxjx4ycfzs96aqvh97grsux0s8nsxur",
		);
	});

	it("should derive an address from an mnemonic (secp256k1)", async (context) => {
		await context.app.resolve<ECDSA>(ECDSA).register();

		assert.is(
			await context.app.resolve(AddressFactory).fromMnemonic(mnemonic),
			"mod1q05ypy7qw2hhqqz28rwetc6dauge6g6g65npy2qht5pjuheqwrse7gxkhwv",
		);
	});

	it("should derive an address from a public key (schnorr)", async (context) => {
		await context.app.resolve<Schnorr>(Schnorr).register();

		assert.is(
			await context.app
				.resolve(AddressFactory)
				.fromPublicKey("e84093c072af70004a38dd95e34def119d2348d5261228175d032e5f2070e19f"),
			"mod1apqf8srj4acqqj3cmk27xn00zxwjxjx4ycfzs96aqvh97grsux0s8nsxur",
		);
	});

	it("should derive an address from a public key (secp256k1)", async (context) => {
		await context.app.resolve<ECDSA>(ECDSA).register();

		assert.is(
			await context.app
				.resolve(AddressFactory)
				.fromPublicKey("03e84093c072af70004a38dd95e34def119d2348d5261228175d032e5f2070e19f"),
			"mod1q05ypy7qw2hhqqz28rwetc6dauge6g6g65npy2qht5pjuheqwrse7gxkhwv",
		);
	});

	it("should validate addresses", async (context) => {
		await context.app.resolve<ECDSA>(ECDSA).register();

		assert.true(
			await context.app
				.resolve(AddressFactory)
				.validate("mod1q05ypy7qw2hhqqz28rwetc6dauge6g6g65npy2qht5pjuheqwrse7gxkhwv"),
		);
		assert.true(
			await context.app
				.resolve(AddressFactory)
				.validate("mod1apqf8srj4acqqj3cmk27xn00zxwjxjx4ycfzs96aqvh97grsux0s8nsxur"),
		);
		assert.false(
			await context.app
				.resolve(AddressFactory)
				.validate("m0d1q05ypy7qw2hhqqz28rwetc6dauge6g6g65npy2qht5pjuheqwrse7gxkhwv"),
		);
	});
});
