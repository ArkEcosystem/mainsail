import { Container } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { Configuration } from "@mainsail/crypto-config";
import { ServiceProvider as ECDSA } from "@mainsail/crypto-key-pair-ecdsa";
import { ServiceProvider as Schnorr } from "@mainsail/crypto-key-pair-schnorr";
import { Application } from "@mainsail/kernel";
import { ServiceProvider as CoreValidation } from "@mainsail/validation";

import { describe } from "../../test-framework";
import { AddressFactory } from "./address.factory";

const mnemonic = "this is a top secret passphrase";

describe<{ app: Application }>("AddressFactory", ({ assert, beforeEach, it }) => {
	beforeEach(async (context) => {
		context.app = new Application(new Container());
		context.app.bind(Identifiers.Cryptography.Configuration).to(Configuration).inSingletonScope();
		context.app.get<Contracts.Crypto.Configuration>(Identifiers.Cryptography.Configuration).setConfig({
			milestones: [
				// @ts-ignore
				{
					address: {
						base58: 30,
					},
				},
			],
		});

		await context.app.resolve(CoreValidation).register();
	});

	it("should derive an address from an mnemonic (schnorr)", async (context) => {
		await context.app.resolve<Schnorr>(Schnorr).register();

		assert.is(
			await context.app.resolve(AddressFactory).fromMnemonic(mnemonic),
			"D5jdQXLMgL2TumzdJ8B1zVAGtYWc43VQSx",
		);
	});

	it("should derive an address from an mnemonic (secp256k1)", async (context) => {
		await context.app.resolve<ECDSA>(ECDSA).register();

		assert.is(
			await context.app.resolve(AddressFactory).fromMnemonic(mnemonic),
			"D61mfSggzbvQgTUe6JhYKH2doHaqJ3Dyib",
		);
	});

	it("should derive an address from a public key (schnorr)", async (context) => {
		await context.app.resolve<Schnorr>(Schnorr).register();

		assert.is(
			await context.app
				.resolve(AddressFactory)
				.fromPublicKey("e84093c072af70004a38dd95e34def119d2348d5261228175d032e5f2070e19f"),
			"DRuQRMywxznq9pMQUAXLcwt7C8ZLs8NDBv",
		);
	});

	it("should derive an address from a public key (secp256k1)", async (context) => {
		await context.app.resolve<ECDSA>(ECDSA).register();

		assert.is(
			await context.app
				.resolve(AddressFactory)
				.fromPublicKey("034151a3ec46b5670a682b0a63394f863587d1bc97483b1b6c70eb58e7f0aed192"),
			"D61mfSggzbvQgTUe6JhYKH2doHaqJ3Dyib",
		);
	});

	it("should validate addresses", async (context) => {
		await context.app.resolve<ECDSA>(ECDSA).register();

		assert.true(await context.app.resolve(AddressFactory).validate("D61mfSggzbvQgTUe6JhYKH2doHaqJ3Dyib"));
		assert.false(
			await context.app
				.resolve(AddressFactory)
				.validate("m0d1q05ypy7qw2hhqqz28rwetc6dauge6g6g65npy2qht5pjuheqwrse7gxkhwv"),
		);
	});

	it("should convert between buffer", async (context) => {
		await context.app.resolve<ECDSA>(ECDSA).register();

		const addressFactory = context.app.resolve(AddressFactory);

		assert.equal(
			await addressFactory.fromBuffer(await addressFactory.toBuffer("D61mfSggzbvQgTUe6JhYKH2doHaqJ3Dyib")),
			"D61mfSggzbvQgTUe6JhYKH2doHaqJ3Dyib",
		);
	});
});
