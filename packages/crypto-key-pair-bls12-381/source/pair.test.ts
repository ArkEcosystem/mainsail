import { Application } from "@mainsail/kernel";
import { Identifiers } from "@mainsail/constants";
import type { Contracts } from "@mainsail/contracts";
import { NotImplemented } from "@mainsail/exceptions";
import { ServiceProvider as ValidationServiceProvider } from "@mainsail/validation";
import { ServiceProvider as CryptoConfigServiceProvider } from "@mainsail/crypto-config";
import { ServiceProvider as CryptoWifServiceProvider } from "@mainsail/crypto-wif";

import cryptoJson from "../../core/bin/config/devnet/core/crypto.json";
import { describe } from "@mainsail/test-runner";
import { KeyPairFactory } from "./pair";

import { wallets } from "../../crypto-wif/test/index.js";

describe<{ app: Application; factory: KeyPairFactory }>("KeyPairFactory", ({ assert, beforeEach, it, each }) => {
	beforeEach(async (context) => {
		context.app = new Application();
		context.app.get<Contracts.Kernel.Repository>(Identifiers.Config.Repository).set("crypto", cryptoJson);
		await context.app.resolve(ValidationServiceProvider).register();
		await context.app.resolve(CryptoConfigServiceProvider).register();
		await context.app.resolve(CryptoWifServiceProvider).register();

		context.factory = context.app.resolve(KeyPairFactory);
	});

	each("#fromMnemonic - should derive a key pair from mnemonic", async ({ context: { factory }, dataset: wallet }) => {
		assert.equal(await factory.fromMnemonic(wallet.mnemonic), {
			compressed: true,
			privateKey: wallet.validatorPrivateKey,
			publicKey: wallet.validatorPublicKey,
		});
	}, wallets);

	each("#fromPrivateKey - should derive a key pair from a private key", async ({ context: { factory }, dataset: wallet }) => {
		assert.equal(
			await factory.fromPrivateKey(
				Buffer.from(wallet.validatorPrivateKey, "hex"),
			),
			{
				compressed: true,
				privateKey: wallet.validatorPrivateKey,
				publicKey: wallet.validatorPublicKey,
			},
		);
	}, wallets);

	it("#fromWIF - should throw NotImplemented", async ({  factory }) => {
		await assert.rejects(() => factory.fromWIF(""), NotImplemented);
	});
});
