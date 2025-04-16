import { Contracts } from "@mainsail/contracts";
import { BigNumber } from "@mainsail/utils";

import cryptoConfig from "../../../../core/bin/config/devnet/core/crypto.json";
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
		const entity = await factoryBuilder.get("Block").make<Contracts.Crypto.Commit>();

		assert.string(entity.block.data.proposer);
		assert.number(entity.block.data.number);
		assert.string(entity.block.data.hash);
		assert.number(entity.block.data.transactionsCount);
		assert.string(entity.block.data.stateRoot);
		assert.number(entity.block.data.payloadSize);
		assert.string(entity.block.data.parentHash);
		assert.instance(entity.block.data.reward, BigNumber);
		assert.number(entity.block.data.timestamp);
		assert.instance(entity.block.data.amount, BigNumber);
		assert.instance(entity.block.data.fee, BigNumber);
		assert.number(entity.block.data.version);
		assert.string(entity.block.serialized);
		assert.array(entity.block.transactions);
	});

	it("should create a single block with previous block in options", async ({ factoryBuilder }) => {
		const previousBlock = await factoryBuilder.get("Block").make<Contracts.Crypto.Commit>();

		const options = {
			getPreviousBlock(): Contracts.Crypto.BlockData {
				return previousBlock.block.data;
			},
		};

		const entity = await factoryBuilder.get("Block").withOptions(options).make<Contracts.Crypto.Commit>();

		assert.string(entity.block.data.proposer);
		assert.number(entity.block.data.number);
		assert.string(entity.block.data.hash);
		assert.number(entity.block.data.transactionsCount);
		assert.string(entity.block.data.stateRoot);
		assert.number(entity.block.data.payloadSize);
		assert.string(entity.block.data.parentHash);
		assert.instance(entity.block.data.reward, BigNumber);
		assert.number(entity.block.data.timestamp);
		assert.instance(entity.block.data.amount, BigNumber);
		assert.instance(entity.block.data.fee, BigNumber);
		assert.number(entity.block.data.version);
		assert.string(entity.block.serialized);
		assert.array(entity.block.transactions);
	});

	it("should create a single block with transactions in options", async ({ factoryBuilder }) => {
		const options = {
			transactionsCount: 1,
		};

		const entity = await factoryBuilder.get("Block").withOptions(options).make<Contracts.Crypto.Commit>();

		assert.string(entity.block.data.proposer);
		assert.number(entity.block.data.number);
		assert.string(entity.block.data.hash);
		assert.number(entity.block.data.transactionsCount);
		assert.string(entity.block.data.stateRoot);
		assert.number(entity.block.data.payloadSize);
		assert.string(entity.block.data.parentHash);
		assert.instance(entity.block.data.reward, BigNumber);
		assert.number(entity.block.data.timestamp);
		assert.instance(entity.block.data.amount, BigNumber);
		assert.instance(entity.block.data.fee, BigNumber);
		assert.number(entity.block.data.version);
		assert.string(entity.block.serialized);
		assert.array(entity.block.transactions);
	});
});
