import { Wallets } from "@arkecosystem/core-state";
import { BigNumber } from "@arkecosystem/utils";

import cryptoConfig from "../../../../core/bin/config/testnet/crypto.json";
import { describe } from "../../index";
import { FactoryBuilder } from "../factory-builder";
import { registerRoundFactory } from "./round";

describe<{
	factoryBuilder: FactoryBuilder;
}>("RoundFactory", ({ beforeEach, it, assert }) => {
	beforeEach(async (context) => {
		context.factoryBuilder = new FactoryBuilder();

		await registerRoundFactory(context.factoryBuilder, cryptoConfig);
	});

	it("should create a round with validators", async ({ factoryBuilder }) => {
		const entity = await factoryBuilder.get("Round").make<Wallets.Wallet[]>();

		assert.array(entity);
		assert.gt(entity.length, 0);

		for (const validator of entity) {
			assert.instance(validator, Wallets.Wallet);
			assert.string(validator.getAddress());
			assert.string(validator.getPublicKey());
			assert.instance(validator.getBalance(), BigNumber);
			assert.instance(validator.getNonce(), BigNumber);
			assert.true(validator.isValidator());
		}
	});
});
