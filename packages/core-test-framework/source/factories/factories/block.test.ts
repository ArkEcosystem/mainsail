import { Contracts } from "@arkecosystem/core-contracts";
import { BigNumber } from "@arkecosystem/utils";

import cryptoConfig from "../../../../core/bin/config/testnet/crypto.json";
import { describe, Sandbox } from "../../index";
import { FactoryBuilder } from "../factory-builder";
import { registerBlockFactory } from "./block";

describe<{
	sandbox: Sandbox;
	factoryBuilder: FactoryBuilder;
}>("BlockFactory", ({ beforeEach, it, assert }) => {
	beforeEach(async (context) => {
		context.factoryBuilder = new FactoryBuilder();
		await registerBlockFactory(context.factoryBuilder, cryptoConfig);
	});

	it("should create a single block", async ({ factoryBuilder }) => {
		const entity = await factoryBuilder.get("Block").make<Contracts.Crypto.IBlock>();

		assert.string(entity.data.blockSignature);
		assert.string(entity.data.generatorPublicKey);
		assert.number(entity.data.height);
		assert.string(entity.data.id);
		assert.number(entity.data.numberOfTransactions);
		assert.string(entity.data.payloadHash);
		assert.number(entity.data.payloadLength);
		assert.string(entity.data.previousBlock);
		assert.instance(entity.data.reward, BigNumber);
		assert.number(entity.data.timestamp);
		assert.instance(entity.data.totalAmount, BigNumber);
		assert.instance(entity.data.totalFee, BigNumber);
		assert.number(entity.data.version);
		assert.string(entity.serialized);
		assert.array(entity.transactions);
	});

	it("should create a single block with previous block in options", async ({ factoryBuilder }) => {
		const previousBlock = await factoryBuilder.get("Block").make<Contracts.Crypto.IBlock>();

		const options = {
			getPreviousBlock(): Contracts.Crypto.IBlockData {
				return previousBlock.data;
			},
		};

		const entity = await factoryBuilder.get("Block").withOptions(options).make<Contracts.Crypto.IBlock>();

		assert.string(entity.data.blockSignature);
		assert.string(entity.data.generatorPublicKey);
		assert.number(entity.data.height);
		assert.string(entity.data.id);
		assert.number(entity.data.numberOfTransactions);
		assert.string(entity.data.payloadHash);
		assert.number(entity.data.payloadLength);
		assert.string(entity.data.previousBlock);
		assert.instance(entity.data.reward, BigNumber);
		assert.number(entity.data.timestamp);
		assert.instance(entity.data.totalAmount, BigNumber);
		assert.instance(entity.data.totalFee, BigNumber);
		assert.number(entity.data.version);
		assert.string(entity.serialized);
		assert.array(entity.transactions);
	});

	it("should create a single block with transactions in options", async ({ factoryBuilder }) => {
		const options = {
			transactionsCount: 1,
		};

		const entity = await factoryBuilder.get("Block").withOptions(options).make<Contracts.Crypto.IBlock>();

		assert.string(entity.data.blockSignature);
		assert.string(entity.data.generatorPublicKey);
		assert.number(entity.data.height);
		assert.string(entity.data.id);
		assert.number(entity.data.numberOfTransactions);
		assert.string(entity.data.payloadHash);
		assert.number(entity.data.payloadLength);
		assert.string(entity.data.previousBlock);
		assert.instance(entity.data.reward, BigNumber);
		assert.number(entity.data.timestamp);
		assert.instance(entity.data.totalAmount, BigNumber);
		assert.instance(entity.data.totalFee, BigNumber);
		assert.number(entity.data.version);
		assert.string(entity.serialized);
		assert.array(entity.transactions);
		assert.equal(entity.transactions.length, 1);
	});
});
