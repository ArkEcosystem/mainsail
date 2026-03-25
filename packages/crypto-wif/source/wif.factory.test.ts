import { Identifiers } from "@mainsail/constants";
import { Contracts } from "@mainsail/contracts";
import { ServiceProvider as ValidationServiceProvider } from "@mainsail/validation";
import { ServiceProvider as CryptoConfigServiceProvider } from "@mainsail/crypto-config";
import { KeyPairFactory } from "@mainsail/crypto-key-pair-ecdsa/source/pair";

import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";
import { mnemonic, wif } from "../test/identity.json";
import { WIFFactory } from "./wif.factory";
import cryptoJson from "../../core/bin/config/devnet/core/crypto.json";

describe<{
	app: Application;
	factory: WIFFactory;
}>("Identities - WIFFactory", ({ it, assert, beforeEach }) => {
	beforeEach(async (context) => {
		context.app = new Application();
		context.app.get<Contracts.Kernel.Repository>(Identifiers.Config.Repository).set("crypto", cryptoJson);
		await context.app.resolve(ValidationServiceProvider).register();
		await context.app.resolve(CryptoConfigServiceProvider).register();

		context.app.get<Contracts.Crypto.Configuration>(Identifiers.Cryptography.Configuration).set("network.wif", 170);

		context.app.bind(Identifiers.Cryptography.Identity.KeyPair.Factory).to(KeyPairFactory).inSingletonScope();

		context.factory = context.app.resolve(WIFFactory);
	});

	it("#fromMnemonic - should be OK", async ({ factory }) => {
		assert.equal(await factory.fromMnemonic(mnemonic), wif);
	});

	it("#fromKeys -  should be OK", async ({ factory, app }) => {
		assert.equal(
			await factory.fromKeys(
				await app.get<KeyPairFactory>(Identifiers.Cryptography.Identity.KeyPair.Factory).fromMnemonic(mnemonic),
			),
			wif,
		);
	});
});
