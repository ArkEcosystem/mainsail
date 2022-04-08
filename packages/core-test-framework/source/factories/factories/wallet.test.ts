import { Wallets } from "@arkecosystem/core-state";

import cryptoConfig from "../../../../core/bin/config/testnet/crypto.json";
import { describe } from "../../index";
import { FactoryBuilder } from "../factory-builder";
import { registerWalletFactory } from "./wallet";

describe<{
	factoryBuilder: FactoryBuilder;
}>("WalletFactory", ({ beforeEach, it, assert }) => {
	beforeEach(async (context) => {
		context.factoryBuilder = new FactoryBuilder();
		await registerWalletFactory(context.factoryBuilder, cryptoConfig);
	});

	it("should make a wallet", async ({ factoryBuilder }) => {
		const entity: Wallets.Wallet = await factoryBuilder.get("Wallet").make<Wallets.Wallet>();

		assert.instance(entity, Wallets.Wallet);
		assert.string(entity.getAddress());
		assert.string(entity.getPublicKey());
	});
});
