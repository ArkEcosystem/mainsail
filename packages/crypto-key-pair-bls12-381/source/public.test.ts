import { Application } from "@mainsail/kernel";
import { Identifiers } from "@mainsail/constants";
import { NotImplemented } from "@mainsail/exceptions";
import type { Contracts } from "@mainsail/contracts";
import { ServiceProvider as ValidationServiceProvider } from "@mainsail/validation";
import { ServiceProvider as CryptoConfigServiceProvider } from "@mainsail/crypto-config";
import { ServiceProvider as CryptoWifServiceProvider } from "@mainsail/crypto-wif";

import { describe } from "@mainsail/test-runner";
import { KeyPairFactory } from "./pair";
import { PublicKeyFactory } from "./public";
import { wallets } from "../../crypto-wif/test/index.js";

import cryptoJson from "../../core/bin/config/devnet/core/crypto.json";

describe<{ app: Application; factory: PublicKeyFactory }>("PublicKeyFactory", ({ assert, beforeEach, each, it }) => {
	beforeEach(async (context) => {
		context.app = new Application();
		context.app.get<Contracts.Kernel.Repository>(Identifiers.Config.Repository).set("crypto", cryptoJson);
		await context.app.resolve(ValidationServiceProvider).register();
		await context.app.resolve(CryptoConfigServiceProvider).register();
		await context.app.resolve(CryptoWifServiceProvider).register();
		context.app.bind(Identifiers.Cryptography.Identity.KeyPair.Factory).to(KeyPairFactory).inSingletonScope();

		context.factory = context.app.resolve(PublicKeyFactory);
	});

	each(
		"#fromMnemonic -should derive a key pair from an mnemonic",
		async ({ context: { factory }, dataset: wallet }) => {
			assert.is(await factory.fromMnemonic(wallet.mnemonic), wallet.validatorPublicKey);
		},
		wallets,
	);

	it("#fromWIF - should throw NotImplemented", async ({ factory }) => {
		await assert.rejects(() => factory.fromWIF(""), NotImplemented);
	});

	each(
		"#verify - should pass with valid public keys",
		async ({ context, dataset }) => {
			assert.true(await context.factory.verify(dataset));
		},
		[
			"95af988701a6fb60e09da41d2ca1a9e0b49e43501bda4255b3ca01073f490c34102b6bbcafde6333185e9980745d72cb",
			"97f1d3a73197d7942695638c4fa9ac0fc3688c4f9774b905a14e3a3f171bac586c55e83ff97a1aeffb3af00adb22c6bb",
		].concat(wallets.map((wallet) => wallet.validatorPublicKey)),
	);

	each(
		"#verify - should fail with invalid public keys",
		async ({ context, dataset }) => {
			assert.false(await context.factory.verify(dataset));
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

	it("#aggregate - should aggregate public keys", async ({ factory }) => {
		assert.equal(
			await factory.aggregate([
				Buffer.from(
					"95af988701a6fb60e09da41d2ca1a9e0b49e43501bda4255b3ca01073f490c34102b6bbcafde6333185e9980745d72cb",
					"hex",
				),
				Buffer.from(
					"97f1d3a73197d7942695638c4fa9ac0fc3688c4f9774b905a14e3a3f171bac586c55e83ff97a1aeffb3af00adb22c6bb",
					"hex",
				),
			]),
			"ac58473340898df1df2c37109e974cdcacd53ec916b4c38ce643cc96e2a6ae689369a96dd6385351510cfb09a2ecfa57",
		);
	});
});
