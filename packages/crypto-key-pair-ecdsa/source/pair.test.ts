import { Application } from "@mainsail/kernel";
import { Identifiers } from "@mainsail/constants";
import { Contracts } from "@mainsail/contracts";
import { WifNetworkError } from "@mainsail/exceptions";
import { ServiceProvider as ValidationServiceProvider } from "@mainsail/validation";
import { ServiceProvider as CryptoConfigServiceProvider } from "@mainsail/crypto-config";

import { describe } from "@mainsail/test-runner";
import { KeyPairFactory } from "./pair";
import { wallets } from "../../crypto-wif/test/index.js";
import cryptoJson from "../../core/bin/config/devnet/core/crypto.json";

describe<{
	app: Application;
	factory: KeyPairFactory;
	configuration: Contracts.Crypto.Configuration;
}>("KeyPairFactory", ({ assert, beforeEach, it, each }) => {
	beforeEach(async (context) => {
		context.app = new Application();
		context.app.get<Contracts.Kernel.Repository>(Identifiers.Config.Repository).set("crypto", cryptoJson);
		await context.app.resolve(ValidationServiceProvider).register();
		await context.app.resolve(CryptoConfigServiceProvider).register();

		context.configuration = context.app.get<Contracts.Crypto.Configuration>(Identifiers.Cryptography.Configuration);
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


	each("#fromWIF - should derive a key pair from a WIF 170", async ({ context: { factory, configuration }, dataset: wallet }) => {
		configuration.set("network.wif", 170);
		assert.equal(await factory.fromWIF(wallet.wif170), {
			compressed: true,
			privateKey: wallet.privateKey,
			publicKey: wallet.publicKey,
		});
	}, wallets);

	each("#fromWIF - should derive a key pair from a WIF 170", async ({ context: { factory }, dataset: wallet }) => {
		await assert.rejects(() => factory.fromWIF(wallet.wif170), WifNetworkError);
	}, wallets);
});
