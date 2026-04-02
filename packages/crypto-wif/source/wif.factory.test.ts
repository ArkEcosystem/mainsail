import { Identifiers } from "@mainsail/constants";
import { Contracts } from "@mainsail/contracts";
import { ServiceProvider as ValidationServiceProvider } from "@mainsail/validation";
import { ServiceProvider as CryptoConfigServiceProvider } from "@mainsail/crypto-config";
import { KeyPairFactory } from "@mainsail/crypto-key-pair-ecdsa/source/pair";

import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";
import { wallets } from "../test/index.js";
import { WIFFactory } from "./wif.factory";
import cryptoJson from "../../core/bin/config/devnet/core/crypto.json";

describe<{
	app: Application;
	factory: WIFFactory;
	configuration: Contracts.Crypto.Configuration;
}>("Identities - WIFFactory", ({ it, assert, beforeEach, each }) => {
	beforeEach(async (context) => {
		context.app = new Application();
		context.app.get<Contracts.Kernel.Repository>(Identifiers.Config.Repository).set("crypto", cryptoJson);
		await context.app.resolve(ValidationServiceProvider).register();
		await context.app.resolve(CryptoConfigServiceProvider).register();


		context.app.bind(Identifiers.Cryptography.Identity.Wif.Decoder).toConstantValue({});
		context.app.bind(Identifiers.Cryptography.Identity.KeyPair.Factory).to(KeyPairFactory).inSingletonScope();

		context.configuration = context.app.get<Contracts.Crypto.Configuration>(Identifiers.Cryptography.Configuration);
		context.factory = context.app.resolve(WIFFactory);
	});

	each("#fromMnemonic - should be OK", async ({ context: { factory }, dataset: wallet }) => {
		assert.equal(await factory.fromMnemonic(wallet.mnemonic), wallet.wif);
	}, wallets);

	each("#fromMnemonic - should be OK for WIF 170", async ({ context: { factory, configuration }, dataset: wallet }) => {
		configuration.set("network.wif", 170);
		assert.equal(await factory.fromMnemonic(wallet.mnemonic), wallet.wif170);
	}, wallets);

	each("#fromKeys -  should be OK", async ({ context: { factory, app }, dataset: wallet }) => {
		assert.equal(
			await factory.fromKeys(
				await app.get<KeyPairFactory>(Identifiers.Cryptography.Identity.KeyPair.Factory).fromMnemonic(wallet.mnemonic),
			),
			wallet.wif,
		);
	}, wallets);

	each("#fromKeys -  should be OK for WIF 170", async ({ context: { factory, app, configuration }, dataset: wallet }) => {
		configuration.set("network.wif", 170);
		assert.equal(
			await factory.fromKeys(
				await app.get<KeyPairFactory>(Identifiers.Cryptography.Identity.KeyPair.Factory).fromMnemonic(wallet.mnemonic),
			),
			wallet.wif170,
		);
	}, wallets);
});
