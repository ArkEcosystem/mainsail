import type { Contracts } from "@mainsail/contracts";
import { Identifiers } from "@mainsail/constants";
import { Configuration } from "@mainsail/crypto-config";
import { ServiceProvider as ECDSA } from "@mainsail/crypto-key-pair-ecdsa";
import { ServiceProvider as CryptoHashBcrypto } from "@mainsail/crypto-hash-bcrypto";
import { Application } from "@mainsail/kernel";
import { ServiceProvider as ValidationServiceProvider } from "@mainsail/validation";
import cryptoConfig from "../../core/bin/config/devnet/core/crypto.json";

import { describe } from "@mainsail/test-runner";
import { AddressFactory } from "./address.factory";

const mnemonic = "this is a top secret passphrase";
const wif = "SGq4xLgZKCGxs7bjmwnBrWcT4C1ADFEermj846KC97FSv1WFD1dA";

describe<{ app: Application }>("AddressFactory", ({ assert, beforeEach, it }) => {
	beforeEach(async (context) => {
		context.app = new Application();
		await context.app.resolve(ValidationServiceProvider).register();

		context.app.bind(Identifiers.Cryptography.Configuration).to(Configuration).inSingletonScope();
		context.app.get<Contracts.Crypto.Configuration>(Identifiers.Cryptography.Configuration).setConfig(cryptoConfig);
		context.app.get<Contracts.Crypto.Configuration>(Identifiers.Cryptography.Configuration).set("network.wif", 170);

		await context.app.resolve<ECDSA>(ECDSA).register();
		await context.app.resolve<CryptoHashBcrypto>(CryptoHashBcrypto).register();
	});

	it("should derive an address from an mnemonic", async (context) => {
		assert.is(
			await context.app.resolve(AddressFactory).fromMnemonic(mnemonic),
			"D61mfSggzbvQgTUe6JhYKH2doHaqJ3Dyib",
		);
	});

	it("should derive an address from multi signature address", async (context) => {
		assert.is(
			await context.app.resolve(AddressFactory).fromMultiSignatureAsset({
				min: 3,
				publicKeys: [
					"0235d486fea0193cbe77e955ab175b8f6eb9eaf784de689beffbd649989f5d6be3",
					"03a46f2547d20b47003c1c376788db5a54d67264df2ae914f70bf453b6a1fa1b3a",
					"03d7dfe44e771039334f4712fb95ad355254f674c8f5d286503199157b7bf7c357",
				],
			}),
			"D8UtPGvjKzjn1fN5GfESoTrTrkQv6XjALS",
		);
	});

	it("should derive an address from a public key", async (context) => {
		assert.is(
			await context.app
				.resolve(AddressFactory)
				.fromPublicKey("034151a3ec46b5670a682b0a63394f863587d1bc97483b1b6c70eb58e7f0aed192"),
			"D61mfSggzbvQgTUe6JhYKH2doHaqJ3Dyib",
		);
	});

	it("should derive an address from wif", async (context) => {
		assert.is(await context.app.resolve(AddressFactory).fromWIF(wif), "D61mfSggzbvQgTUe6JhYKH2doHaqJ3Dyib");
	});

	it("should validate addresses", async (context) => {
		assert.true(await context.app.resolve(AddressFactory).validate("D61mfSggzbvQgTUe6JhYKH2doHaqJ3Dyib"));
		assert.false(
			await context.app
				.resolve(AddressFactory)
				.validate("m0d1q05ypy7qw2hhqqz28rwetc6dauge6g6g65npy2qht5pjuheqwrse7gxkhwv"),
		);
	});

	it("should convert between buffer", async (context) => {
		const addressFactory = context.app.resolve(AddressFactory);

		assert.equal(
			await addressFactory.fromBuffer(await addressFactory.toBuffer("D61mfSggzbvQgTUe6JhYKH2doHaqJ3Dyib")),
			"D61mfSggzbvQgTUe6JhYKH2doHaqJ3Dyib",
		);
	});

	it("should throw if pubKeyHash doesn't match", async (context) => {
		const addressFactory = context.app.resolve(AddressFactory);

		context.app
			.get<Contracts.Crypto.Configuration>(Identifiers.Cryptography.Configuration)
			.set("network.pubKeyHash", 44);

		await assert.rejects(
			() => addressFactory.toBuffer("D61mfSggzbvQgTUe6JhYKH2doHaqJ3Dyib"),
			"Expected address network byte 44, but got 30.",
		);
	});

	it("should throw invalid checksum", async (context) => {
		const addressFactory = context.app.resolve(AddressFactory);

		await assert.rejects(
			() => addressFactory.toBuffer("E61mfSggzbvQgTUe6JhYKH2doHaqJ3Dyib"),
			"Invalid checksum for base58 string.",
		);
	});
});
