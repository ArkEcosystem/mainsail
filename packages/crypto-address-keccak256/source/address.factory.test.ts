import { Identifiers } from "@mainsail/constants";
import { ServiceProvider as ECDSA } from "@mainsail/crypto-key-pair-ecdsa";
import { Application } from "@mainsail/kernel";
import { Contracts } from "@mainsail/contracts";
import { ServiceProvider as ValidationServiceProvider } from "@mainsail/validation";
import { ServiceProvider as CryptoConfigServiceProvider } from "@mainsail/crypto-config";

import { describe } from "@mainsail/test-runner";
import { AddressFactory } from "./address.factory";

import { wallets } from "../../crypto-wif/test/index.js";
import cryptoJson from "../../core/bin/config/devnet/core/crypto.json";

describe<{ app: Application, factory: AddressFactory }>("AddressFactory", ({ assert, beforeEach, it, each }) => {
	beforeEach(async (context) => {
		context.app = new Application();
		context.app.get<Contracts.Kernel.Repository>(Identifiers.Config.Repository).set("crypto", cryptoJson);
		await context.app.resolve(ValidationServiceProvider).register();
		await context.app.resolve(CryptoConfigServiceProvider).register();

		await context.app.resolve<ECDSA>(ECDSA).register();

		context.factory = context.app.resolve(AddressFactory);
	});

	each("#fromMnemonic - should derive an address from an mnemonic", async ({ context: { factory }, dataset: wallet}) => {
		assert.is(
			await factory.fromMnemonic(wallet.mnemonic),
			wallet.address,
		);
	}, wallets);

	each("#fromPublicKey - should derive an address from a public key", async ({ context: { factory }, dataset: wallet}) => {
		assert.is(
			await factory.fromPublicKey(wallet.publicKey),
			wallet.address,
		);
	}, wallets);

	it("#fromPublicKey - should throw if public key doesn't have 65 chars", async ({ factory }) => {
		await assert.rejects(
			() => factory.fromPublicKey("0".repeat(66 * 2)),
			"Invalid uncompressed public key",
		);
	});

	it("#fromPublicKey - should throw if public key doesn't start with 0x04", async ({ factory }) => {
		await assert.rejects(
			() => factory.fromPublicKey("0".repeat(65 * 2)),
			"Invalid uncompressed public key",
		);
	});

	each("#fromWIF - should derive an address from wif", async ({ context: { factory }, dataset: wallet}) => {
		assert.is(await factory.fromWIF(wallet.wif), wallet.address);
	}, wallets);

	it("#fromMultiSignatureAsset - should derive an address from multi signature address", async ({ factory }) => {
		assert.is(
			await factory.fromMultiSignatureAsset({
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

	each("#validate - should be valid", async ({ context: { factory }, dataset: address}) => {
		assert.true(await factory.validate(address));
	}, ["0xC7C50f33278bDe272ffe23865fF9fBd0155a5175", "0xC7C50f33278bDe272ffe23865fF9fBd0155a5175"].concat(wallets.map(wallet => wallet.address)));

	it("#validate - should be invalid", async ({ factory}) => {
		assert.false(await factory.validate("0xC7C50f33278bde272ffe23865ff9fbd0155a5175"));
		assert.false(
			await factory
				.validate("m0d1q05ypy7qw2hhqqz28rwetc6dauge6g6g65npy2qht5pjuheqwrse7gxkhwv"),
		);
	});

	it("#toBuffer and #fromBuffer - should convert from and to buffer", async ({ factory }) => {
		const buffer = await factory.toBuffer("0xC7C50f33278bDe272ffe23865fF9fBd0155a5175");
		assert.equal(buffer.byteLength, 20);

		const restored = await factory.fromBuffer(buffer);
		assert.equal(restored, "0xC7C50f33278bDe272ffe23865fF9fBd0155a5175");
	});
});
