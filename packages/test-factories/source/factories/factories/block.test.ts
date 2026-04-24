import type { Contracts } from "@mainsail/contracts";
import { BigNumber } from "@mainsail/utils";
import { Application } from "@mainsail/kernel";
import cryptoConfig from "../../../../core/bin/config/devnet/core/crypto.json";
import { describe } from "@mainsail/test-runner";
import { FactoryBuilder } from "../factory-builder";
import { registerBlockFactory } from "./block";

describe<{
	app: Application;
	factoryBuilder: FactoryBuilder;
}>("BlockFactory", ({ beforeEach, it, assert }) => {
	beforeEach(async (context) => {
		context.factoryBuilder = new FactoryBuilder();
		await registerBlockFactory(context.factoryBuilder, cryptoConfig);
	});

	it("should create a single block", async ({ factoryBuilder }) => {
		const entity = await factoryBuilder.get("Block").make<Contracts.Crypto.Commit>();

		assert.string(entity.block.proposer);
		assert.number(entity.block.number);
		assert.string(entity.block.hash);
		assert.number(entity.block.transactionsCount);
		assert.string(entity.block.stateRoot);
		assert.number(entity.block.payloadSize);
		assert.string(entity.block.parentHash);
		assert.type(entity.block.reward, "bigint");
		assert.number(entity.block.timestamp);
		assert.type(entity.block.fee, "bigint");
		assert.number(entity.block.version);
		assert.string(entity.block.serialized);
		assert.array(entity.block.transactions);
	});

	it("should create a single block with previous block in options", async ({ factoryBuilder }) => {
		const previousBlock = await factoryBuilder.get("Block").make<Contracts.Crypto.Commit>();

		const options = {
			getPreviousBlock(): Contracts.Crypto.BlockData {
				return previousBlock.block;
			},
		};

		const entity = await factoryBuilder.get("Block").withOptions(options).make<Contracts.Crypto.Commit>();

		assert.string(entity.block.proposer);
		assert.number(entity.block.number);
		assert.string(entity.block.hash);
		assert.number(entity.block.transactionsCount);
		assert.string(entity.block.stateRoot);
		assert.number(entity.block.payloadSize);
		assert.string(entity.block.parentHash);
		assert.type(entity.block.reward, "bigint");
		assert.number(entity.block.timestamp);
		assert.type(entity.block.fee, "bigint");
		assert.number(entity.block.version);
		assert.string(entity.block.serialized);
		assert.array(entity.block.transactions);
	});

	it("should create a single block with transactions in options", async ({ factoryBuilder }) => {
		const options = {
			transactionsCount: 1,
		};

		const entity = await factoryBuilder.get("Block").withOptions(options).make<Contracts.Crypto.Commit>();

		assert.string(entity.block.proposer);
		assert.number(entity.block.number);
		assert.string(entity.block.hash);
		assert.number(entity.block.transactionsCount);
		assert.string(entity.block.stateRoot);
		assert.number(entity.block.payloadSize);
		assert.string(entity.block.parentHash);
		assert.type(entity.block.reward, "bigint");
		assert.number(entity.block.timestamp);
		assert.type(entity.block.fee, "bigint");
		assert.number(entity.block.version);
		assert.string(entity.block.serialized);
		assert.array(entity.block.transactions);
	});
});
