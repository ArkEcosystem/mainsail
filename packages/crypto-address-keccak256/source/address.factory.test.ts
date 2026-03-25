import { Identifiers } from "@mainsail/constants";
import { Configuration } from "@mainsail/crypto-config";
import { ServiceProvider as ECDSA } from "@mainsail/crypto-key-pair-ecdsa";
import { Application } from "@mainsail/kernel";
import { ServiceProvider as ValidationServiceProvider } from "@mainsail/validation";

import { describe } from "@mainsail/test-runner";
import { AddressFactory } from "./address.factory";

const mnemonic =
	"program fragile industry scare sun visit race erase daughter empty anxiety cereal cycle hunt airport educate giggle picture sunset apart jewel similar pulp moment";

const wif = "SDuW66dyGZ1zPZdN7ncEevbJdjaQTj9pT4LcmKzQ7eLFoyCXEdkx";

describe<{ app: Application }>("AddressFactory", ({ assert, beforeEach, it }) => {
	beforeEach(async (context) => {
		context.app = new Application();
		context.app.bind(Identifiers.Cryptography.Configuration).to(Configuration).inSingletonScope();

		await context.app.resolve(ValidationServiceProvider).register();
		await context.app.resolve<ECDSA>(ECDSA).register();
	});

	it("should derive an address from an mnemonic", async (context) => {
		assert.is(
			await context.app.resolve(AddressFactory).fromMnemonic(mnemonic),
			"0xC7C50f33278bDe272ffe23865fF9fBd0155a5175",
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
			"0x970996B998f3C854D9a4D2C327Cc049ae6241C40",
		);
	});

	it("should derive an address from a public key", async (context) => {
		assert.is(
			await context.app
				.resolve(AddressFactory)
				.fromPublicKey("03e84093c072af70004a38dd95e34def119d2348d5261228175d032e5f2070e19f"),
			"0xC7C50f33278bDe272ffe23865fF9fBd0155a5175",
		);
	});

	it("should throw if public key doesn't have 65 chars", async (context) => {
		await assert.rejects(
			() => context.app.resolve(AddressFactory).fromPublicKey("0".repeat(66 * 2)),
			"Invalid uncompressed public key",
		);
	});

	it("should throw if public key doesn't start with 0x04", async (context) => {
		await assert.rejects(
			() => context.app.resolve(AddressFactory).fromPublicKey("0".repeat(65 * 2)),
			"Invalid uncompressed public key",
		);
	});

	it("should derive an address from wif", async (context) => {
		assert.is(await context.app.resolve(AddressFactory).fromWIF(wif), "0xC7C50f33278bDe272ffe23865fF9fBd0155a5175");
	});

	it("should validate addresses", async (context) => {
		assert.true(await context.app.resolve(AddressFactory).validate("0xC7C50f33278bDe272ffe23865fF9fBd0155a5175"));
		assert.true(await context.app.resolve(AddressFactory).validate("0xC7C50f33278bDe272ffe23865fF9fBd0155a5175"));
		assert.false(await context.app.resolve(AddressFactory).validate("0xC7C50f33278bde272ffe23865ff9fbd0155a5175"));
		assert.false(
			await context.app
				.resolve(AddressFactory)
				.validate("m0d1q05ypy7qw2hhqqz28rwetc6dauge6g6g65npy2qht5pjuheqwrse7gxkhwv"),
		);
	});

	it("should convert from and to buffer", async (context) => {
		const buffer = await context.app.resolve(AddressFactory).toBuffer("0xC7C50f33278bDe272ffe23865fF9fBd0155a5175");
		assert.equal(buffer.byteLength, 20);

		const restored = await context.app.resolve(AddressFactory).fromBuffer(buffer);
		assert.equal(restored, "0xC7C50f33278bDe272ffe23865fF9fBd0155a5175");
	});
});
