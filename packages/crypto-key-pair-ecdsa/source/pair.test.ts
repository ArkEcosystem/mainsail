import { Application } from "@mainsail/kernel";
import { Identifiers } from "@mainsail/constants";
import { Configuration } from "@mainsail/crypto-config";
import { ServiceProvider as ValidationServiceProvider } from "@mainsail/validation";

import { describe } from "@mainsail/test-runner";
import { KeyPairFactory } from "./pair";
import { wallet1, wallets } from "../../crypto-wif/test/index.js";

describe<{
	app: Application;
	factory: KeyPairFactory;
}>("KeyPairFactory", ({ assert, beforeEach, it, each }) => {
	beforeEach(async (context) => {
		context.app = new Application();
		await context.app.resolve(ValidationServiceProvider).register();
		context.app.bind(Identifiers.Cryptography.Configuration).to(Configuration).inSingletonScope();

		context.factory = context.app.resolve(KeyPairFactory);
	});

	each("#fromMnemonic - should derive a key pair", async ({ context: { factory }, dataset: wallet }) => {
		assert.equal(await factory.fromMnemonic(wallet.mnemonic), {
			compressed: true,
			privateKey: wallet.privateKey,
			publicKey: wallet.publicKey,
		});
	}, wallets);

	each("#fromPrivateKey - should derive a key pair", async ({ context: { factory }, dataset: wallet }) => {
		assert.equal(
			await factory.fromPrivateKey(
				Buffer.from(wallet.privateKey, "hex"),
			),
			{
				compressed: true,
				privateKey: wallet.privateKey,
				publicKey: wallet.publicKey,
			},
		);
	}, wallets);

	each("#fromWIF - should derive a key pair from a WIF", async ({ context: { factory }, dataset: wallet }) => {
		assert.equal(await factory.fromWIF(wallet.wif), {
			compressed: true,
			privateKey: wallet.privateKey,
			publicKey: wallet.publicKey,
		});
	}, wallets);


	each("#fromWIF - should derive a key pair from a WIF 170", async ({ context: { factory }, dataset: wallet }) => {
		assert.equal(await factory.fromWIF(wallet.wif), {
			compressed: true,
			privateKey: wallet.privateKey,
			publicKey: wallet.publicKey,
		});
	}, wallets);
});
