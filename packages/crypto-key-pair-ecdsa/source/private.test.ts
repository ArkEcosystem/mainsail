import { Application } from "@mainsail/kernel";
import { Identifiers } from "@mainsail/constants";
import { Contracts } from "@mainsail/contracts";
import { ServiceProvider as ValidationServiceProvider } from "@mainsail/validation";
import { ServiceProvider as CryptoConfigServiceProvider } from "@mainsail/crypto-config";

import { describe } from "@mainsail/test-runner";
import { KeyPairFactory } from "./pair.js";
import { PrivateKeyFactory } from "./private";
import { wallets } from "../../crypto-wif/test/index.js";

import cryptoJson from "../../core/bin/config/devnet/core/crypto.json";

describe<{
	app: Application;
	factory: PrivateKeyFactory;
}>("PrivateKeyFactory", ({ assert, beforeEach, it, each }) => {
	beforeEach(async (context) => {
		context.app = new Application();
		context.app.get<Contracts.Kernel.Repository>(Identifiers.Config.Repository).set("crypto", cryptoJson);
		await context.app.resolve(ValidationServiceProvider).register();
		await context.app.resolve(CryptoConfigServiceProvider).register();

		context.app.bind(Identifiers.Cryptography.Identity.KeyPair.Factory).to(KeyPairFactory).inSingletonScope();
		context.factory = context.app.resolve(PrivateKeyFactory);
	});

	each(
		"should derive from an mnemonic",
		async ({ context: { factory }, dataset: wallet }) => {
			assert.is(await factory.fromMnemonic(wallet.mnemonic), wallet.privateKey);
		},
		wallets,
	);

	each(
		"should derive from a WIF",
		async ({ context: { factory }, dataset: wallet }) => {
			assert.is(await factory.fromWIF(wallet.wif), wallet.privateKey);
		},
		wallets,
	);
});
