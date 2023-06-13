import { Contracts } from "@mainsail/contracts";
import { BigNumber } from "@mainsail/utils";

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
		const entity = await factoryBuilder.get("Block").make<Contracts.Crypto.ICommittedBlock>();

		assert.string(entity.block.data.generatorPublicKey);
		assert.number(entity.block.data.height);
		assert.string(entity.block.data.id);
		assert.number(entity.block.data.numberOfTransactions);
		assert.string(entity.block.data.payloadHash);
		assert.number(entity.block.data.payloadLength);
		assert.string(entity.block.data.previousBlock);
		assert.instance(entity.block.data.reward, BigNumber);
		assert.number(entity.block.data.timestamp);
		assert.instance(entity.block.data.totalAmount, BigNumber);
		assert.instance(entity.block.data.totalFee, BigNumber);
		assert.number(entity.block.data.version);
		assert.string(entity.block.serialized);
		assert.array(entity.block.transactions);
	});

	it("should create a single block with previous block in options", async ({ factoryBuilder }) => {
		const previousBlock = await factoryBuilder.get("Block").make<Contracts.Crypto.ICommittedBlock>();

		const options = {
			getPreviousBlock(): Contracts.Crypto.IBlockData {
				return previousBlock.block.data;
			},
		};

		const entity = await factoryBuilder.get("Block").withOptions(options).make<Contracts.Crypto.ICommittedBlock>();

		assert.string(entity.block.data.generatorPublicKey);
		assert.number(entity.block.data.height);
		assert.string(entity.block.data.id);
		assert.number(entity.block.data.numberOfTransactions);
		assert.string(entity.block.data.payloadHash);
		assert.number(entity.block.data.payloadLength);
		assert.string(entity.block.data.previousBlock);
		assert.instance(entity.block.data.reward, BigNumber);
		assert.number(entity.block.data.timestamp);
		assert.instance(entity.block.data.totalAmount, BigNumber);
		assert.instance(entity.block.data.totalFee, BigNumber);
		assert.number(entity.block.data.version);
		assert.string(entity.block.serialized);
		assert.array(entity.block.transactions);
	});

	it("should create a single block with transactions in options", async ({ factoryBuilder }) => {
		const options = {
			transactionsCount: 1,
		};

		const entity = await factoryBuilder.get("Block").withOptions(options).make<Contracts.Crypto.ICommittedBlock>();

		assert.string(entity.block.data.generatorPublicKey);
		assert.number(entity.block.data.height);
		assert.string(entity.block.data.id);
		assert.number(entity.block.data.numberOfTransactions);
		assert.string(entity.block.data.payloadHash);
		assert.number(entity.block.data.payloadLength);
		assert.string(entity.block.data.previousBlock);
		assert.instance(entity.block.data.reward, BigNumber);
		assert.number(entity.block.data.timestamp);
		assert.instance(entity.block.data.totalAmount, BigNumber);
		assert.instance(entity.block.data.totalFee, BigNumber);
		assert.number(entity.block.data.version);
		assert.string(entity.block.serialized);
		assert.array(entity.block.transactions);
		assert.equal(entity.block.transactions.length, 1);
	});
});
