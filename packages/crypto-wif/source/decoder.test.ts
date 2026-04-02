import { Identifiers } from "@mainsail/constants";
import { Contracts } from "@mainsail/contracts";
import { ServiceProvider as ValidationServiceProvider } from "@mainsail/validation";
import { ServiceProvider as CryptoConfigServiceProvider } from "@mainsail/crypto-config";
import { KeyPairFactory } from "@mainsail/crypto-key-pair-ecdsa/source/pair";
import { WifNetworkError } from "@mainsail/exceptions";

import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";
import { wallets } from "../test/index.js";
import { WIFDecoder } from "./decoder.js";
import cryptoJson from "../../core/bin/config/devnet/core/crypto.json";

describe<{
	app: Application;
	decoder: WIFDecoder;
	configuration: Contracts.Crypto.Configuration;
}>("Identities - WIFFactory", ({ it, assert, beforeEach, each }) => {
	beforeEach(async (context) => {
		context.app = new Application();
		context.app.get<Contracts.Kernel.Repository>(Identifiers.Config.Repository).set("crypto", cryptoJson);
		await context.app.resolve(ValidationServiceProvider).register();
		await context.app.resolve(CryptoConfigServiceProvider).register();

		context.configuration = context.app.get<Contracts.Crypto.Configuration>(Identifiers.Cryptography.Configuration);
		context.decoder = context.app.resolve(WIFDecoder);
	});

	each("#toPrivateKey - should be OK", async ({ context: { decoder: factory }, dataset: wallet }) => {
		assert.equal(await factory.toPrivateKey(wallet.wif), { compressed: true, privateKey: wallet.privateKey });
	}, wallets);

	each("#toPrivateKey - should be OK for WIF 170", async ({ context: { decoder: factory, configuration }, dataset: wallet }) => {
		configuration.set("network.wif", 170);
		assert.equal(await factory.toPrivateKey(wallet.wif170), { compressed: true, privateKey: wallet.privateKey });
	}, wallets);


	each("#toPrivateKey - should throw on invalid WIF network version", async ({ context: { decoder: factory }, dataset: wallet }) => {
		await assert.rejects(() => factory.toPrivateKey(wallet.wif170), WifNetworkError);
	}, wallets);
});
