import { Container } from "@arkecosystem/core-container";
import { Utils } from "@arkecosystem/crypto";

import { describe } from "../../core-test-framework";
import { BlockFilter } from "./block-filter";

describe<{
	container: Container.Container;
}>("BlockFilter", ({ assert, beforeEach, it }) => {
	beforeEach((context) => {
		context.container = new Container();
	});

	it("should return true expression for BlockCriteria.unknown", async (context) => {
		const blockFilter = context.container.resolve(BlockFilter);
		const expression = await blockFilter.getExpression({ unknown: "123" } as any);

		assert.equal(expression, { op: "true" });
	});

	it("should compare using equal expression for BlockCriteria.id", async (context) => {
		const blockFilter = context.container.resolve(BlockFilter);
		const expression = await blockFilter.getExpression({ id: "123" });

		assert.equal(expression, { op: "equal", property: "id", value: "123" });
	});

	it("should compare using equal expression for BlockCriteria.version", async (context) => {
		const blockFilter = context.container.resolve(BlockFilter);
		const expression = await blockFilter.getExpression({ version: 1 });

		assert.equal(expression, { op: "equal", property: "version", value: 1 });
	});

	it("should compare using equal expression for BlockCriteria.timestamp", async (context) => {
		const blockFilter = context.container.resolve(BlockFilter);
		const expression = await blockFilter.getExpression({ timestamp: 3600 });

		assert.equal(expression, { op: "equal", property: "timestamp", value: 3600 });
	});

	it("should compare using between expression for BlockCriteria.timestamp", async (context) => {
		const blockFilter = context.container.resolve(BlockFilter);
		const expression = await blockFilter.getExpression({ timestamp: { from: 3600, to: 7200 } });

		assert.equal(expression, { from: 3600, op: "between", property: "timestamp", to: 7200 });
	});

	it("should compare using greater than equal expression for BlockCriteria.timestamp", async (context) => {
		const blockFilter = context.container.resolve(BlockFilter);
		const expression = await blockFilter.getExpression({ timestamp: { from: 3600 } });

		assert.equal(expression, { op: "greaterThanEqual", property: "timestamp", value: 3600 });
	});

	it("should compare using less than equal expression for BlockCriteria.timestamp", async (context) => {
		const blockFilter = context.container.resolve(BlockFilter);
		const expression = await blockFilter.getExpression({ timestamp: { to: 3600 } });

		assert.equal(expression, { op: "lessThanEqual", property: "timestamp", value: 3600 });
	});

	it("should compare using equal expression for BlockCriteria.previousBlock", async (context) => {
		const blockFilter = context.container.resolve(BlockFilter);
		const expression = await blockFilter.getExpression({ previousBlock: "456" });

		assert.equal(expression, { op: "equal", property: "previousBlock", value: "456" });
	});

	it("should compare using equal expression for BlockCriteria.height", async (context) => {
		const blockFilter = context.container.resolve(BlockFilter);
		const expression = await blockFilter.getExpression({ height: 100 });

		assert.equal(expression, { op: "equal", property: "height", value: 100 });
	});

	it("should compare using between expression for BlockCriteria.height", async (context) => {
		const blockFilter = context.container.resolve(BlockFilter);
		const expression = await blockFilter.getExpression({ height: { from: 100, to: 200 } });

		assert.equal(expression, { from: 100, op: "between", property: "height", to: 200 });
	});

	it("should compare using greater than equal expression for BlockCriteria.height", async (context) => {
		const blockFilter = context.container.resolve(BlockFilter);
		const expression = await blockFilter.getExpression({ height: { from: 100 } });

		assert.equal(expression, { op: "greaterThanEqual", property: "height", value: 100 });
	});

	it("should compare using less than equal expression for BlockCriteria.height", async (context) => {
		const blockFilter = context.container.resolve(BlockFilter);
		const expression = await blockFilter.getExpression({ height: { to: 100 } });

		assert.equal(expression, { op: "lessThanEqual", property: "height", value: 100 });
	});

	it("should compare using equal expression for BlockCriteria.numberOfTransactions", async (context) => {
		const blockFilter = context.container.resolve(BlockFilter);
		const expression = await blockFilter.getExpression({ numberOfTransactions: 10 });

		assert.equal(expression, { op: "equal", property: "numberOfTransactions", value: 10 });
	});

	it("should compare using between expression for BlockCriteria.numberOfTransactions", async (context) => {
		const blockFilter = context.container.resolve(BlockFilter);
		const expression = await blockFilter.getExpression({ numberOfTransactions: { from: 10, to: 20 } });

		assert.equal(expression, { from: 10, op: "between", property: "numberOfTransactions", to: 20 });
	});

	it("should compare using greater than equal expression for BlockCriteria.numberOfTransactions", async (context) => {
		const blockFilter = context.container.resolve(BlockFilter);
		const expression = await blockFilter.getExpression({ numberOfTransactions: { from: 10 } });

		assert.equal(expression, { op: "greaterThanEqual", property: "numberOfTransactions", value: 10 });
	});

	it("should compare using less than equal expression for BlockCriteria.numberOfTransactions", async (context) => {
		const blockFilter = context.container.resolve(BlockFilter);
		const expression = await blockFilter.getExpression({ numberOfTransactions: { to: 10 } });

		assert.equal(expression, { op: "lessThanEqual", property: "numberOfTransactions", value: 10 });
	});

	it("should compare using equal expression for BlockCriteria.totalAmount", async (context) => {
		const blockFilter = context.container.resolve(BlockFilter);
		const expression = await blockFilter.getExpression({ totalAmount: Utils.BigNumber.make("10000") });

		assert.equal(expression, {
			op: "equal",
			property: "totalAmount",
			value: Utils.BigNumber.make("10000"),
		});
	});

	it("should compare using between expression for BlockCriteria.totalAmount", async (context) => {
		const blockFilter = context.container.resolve(BlockFilter);
		const expression = await blockFilter.getExpression({
			totalAmount: {
				from: Utils.BigNumber.make("10000"),
				to: Utils.BigNumber.make("20000"),
			},
		});

		assert.equal(expression, {
			from: Utils.BigNumber.make("10000"),
			op: "between",
			property: "totalAmount",
			to: Utils.BigNumber.make("20000"),
		});
	});

	it("should compare using greater than equal expression for BlockCriteria.totalAmount", async (context) => {
		const blockFilter = context.container.resolve(BlockFilter);
		const expression = await blockFilter.getExpression({
			totalAmount: {
				from: Utils.BigNumber.make("10000"),
			},
		});

		assert.equal(expression, {
			op: "greaterThanEqual",
			property: "totalAmount",
			value: Utils.BigNumber.make("10000"),
		});
	});

	it("should compare using less than equal expression for BlockCriteria.totalAmount", async (context) => {
		const blockFilter = context.container.resolve(BlockFilter);
		const expression = await blockFilter.getExpression({
			totalAmount: {
				to: Utils.BigNumber.make("10000"),
			},
		});

		assert.equal(expression, {
			op: "lessThanEqual",
			property: "totalAmount",
			value: Utils.BigNumber.make("10000"),
		});
	});

	it("should compare using equal expression for BlockCriteria.totalFee", async (context) => {
		const blockFilter = context.container.resolve(BlockFilter);
		const expression = await blockFilter.getExpression({ totalFee: Utils.BigNumber.make("100") });

		assert.equal(expression, { op: "equal", property: "totalFee", value: Utils.BigNumber.make("100") });
	});

	it("should compare using between expression for BlockCriteria.totalFee", async (context) => {
		const blockFilter = context.container.resolve(BlockFilter);
		const expression = await blockFilter.getExpression({
			totalFee: {
				from: Utils.BigNumber.make("100"),
				to: Utils.BigNumber.make("200"),
			},
		});

		assert.equal(expression, {
			from: Utils.BigNumber.make("100"),
			op: "between",
			property: "totalFee",
			to: Utils.BigNumber.make("200"),
		});
	});

	it("should compare using greater than equal expression for BlockCriteria.totalFee", async (context) => {
		const blockFilter = context.container.resolve(BlockFilter);
		const expression = await blockFilter.getExpression({
			totalFee: {
				from: Utils.BigNumber.make("100"),
			},
		});

		assert.equal(expression, {
			op: "greaterThanEqual",
			property: "totalFee",
			value: Utils.BigNumber.make("100"),
		});
	});

	it("should compare using less than equal expression for BlockCriteria.totalFee", async (context) => {
		const blockFilter = context.container.resolve(BlockFilter);
		const expression = await blockFilter.getExpression({
			totalFee: {
				to: Utils.BigNumber.make("100"),
			},
		});

		assert.equal(expression, {
			op: "lessThanEqual",
			property: "totalFee",
			value: Utils.BigNumber.make("100"),
		});
	});

	it("should compare using equal expression for BlockCriteria.reward", async (context) => {
		const blockFilter = context.container.resolve(BlockFilter);
		const expression = await blockFilter.getExpression({ reward: Utils.BigNumber.make("1000") });

		assert.equal(expression, { op: "equal", property: "reward", value: Utils.BigNumber.make("1000") });
	});

	it("should compare using between expression for BlockCriteria.reward", async (context) => {
		const blockFilter = context.container.resolve(BlockFilter);
		const expression = await blockFilter.getExpression({
			reward: {
				from: Utils.BigNumber.make("1000"),
				to: Utils.BigNumber.make("2000"),
			},
		});

		assert.equal(expression, {
			from: Utils.BigNumber.make("1000"),
			op: "between",
			property: "reward",
			to: Utils.BigNumber.make("2000"),
		});
	});

	it("should compare using greater than equal expression for BlockCriteria.reward", async (context) => {
		const blockFilter = context.container.resolve(BlockFilter);
		const expression = await blockFilter.getExpression({
			reward: {
				from: Utils.BigNumber.make("1000"),
			},
		});

		assert.equal(expression, {
			op: "greaterThanEqual",
			property: "reward",
			value: Utils.BigNumber.make("1000"),
		});
	});

	it("should compare using less than equal expression for BlockCriteria.reward", async (context) => {
		const blockFilter = context.container.resolve(BlockFilter);
		const expression = await blockFilter.getExpression({
			reward: {
				to: Utils.BigNumber.make("1000"),
			},
		});

		assert.equal(expression, {
			op: "lessThanEqual",
			property: "reward",
			value: Utils.BigNumber.make("1000"),
		});
	});

	it("should compare using equal expression for BlockCriteria.payloadLength", async (context) => {
		const blockFilter = context.container.resolve(BlockFilter);
		const expression = await blockFilter.getExpression({ payloadLength: 1000 });

		assert.equal(expression, { op: "equal", property: "payloadLength", value: 1000 });
	});

	it("should compare using between expression for BlockCriteria.payloadLength", async (context) => {
		const blockFilter = context.container.resolve(BlockFilter);
		const expression = await blockFilter.getExpression({ payloadLength: { from: 1000, to: 2000 } });

		assert.equal(expression, { from: 1000, op: "between", property: "payloadLength", to: 2000 });
	});

	it("should compare using greater than equal expression for BlockCriteria.payloadLength", async (context) => {
		const blockFilter = context.container.resolve(BlockFilter);
		const expression = await blockFilter.getExpression({ payloadLength: { from: 1000 } });

		assert.equal(expression, { op: "greaterThanEqual", property: "payloadLength", value: 1000 });
	});

	it("should compare using less than equal expression for BlockCriteria.payloadLength", async (context) => {
		const blockFilter = context.container.resolve(BlockFilter);
		const expression = await blockFilter.getExpression({ payloadLength: { to: 1000 } });

		assert.equal(expression, { op: "lessThanEqual", property: "payloadLength", value: 1000 });
	});

	it("should compare using equal expression for BlockCriteria.payloadHash", async (context) => {
		const blockFilter = context.container.resolve(BlockFilter);
		const expression = await blockFilter.getExpression({ payloadHash: "123" });

		assert.equal(expression, { op: "equal", property: "payloadHash", value: "123" });
	});

	it("should compare using equal expression for BlockCriteria.generatorPublicKey", async (context) => {
		const blockFilter = context.container.resolve(BlockFilter);
		const expression = await blockFilter.getExpression({ generatorPublicKey: "123" });

		assert.equal(expression, { op: "equal", property: "generatorPublicKey", value: "123" });
	});

	it("should compare using equal expression for BlockCriteria.blockSignature", async (context) => {
		const blockFilter = context.container.resolve(BlockFilter);
		const expression = await blockFilter.getExpression({ blockSignature: "123" });

		assert.equal(expression, { op: "equal", property: "blockSignature", value: "123" });
	});

	it("should compare using equal expression for BlockCriteria.height and BlockCriteria.generatorPublicKey", async (context) => {
		const blockFilter = context.container.resolve(BlockFilter);
		const expression = await blockFilter.getExpression({
			generatorPublicKey: "123",
			height: { from: 100 },
		});

		assert.equal(expression, {
			expressions: [
				{ op: "greaterThanEqual", property: "height", value: 100 },
				{ op: "equal", property: "generatorPublicKey", value: "123" },
			],
			op: "and",
		});
	});

	it("should join using or expression (OrBlockCriteria)", async (context) => {
		const blockFilter = context.container.resolve(BlockFilter);
		const expression = await blockFilter.getExpression([
			{ generatorPublicKey: "123", height: { from: 100 } },
			{ generatorPublicKey: "456", height: { from: 300 } },
		]);

		assert.equal(expression, {
			expressions: [
				{
					expressions: [
						{ op: "greaterThanEqual", property: "height", value: 100 },
						{ op: "equal", property: "generatorPublicKey", value: "123" },
					],
					op: "and",
				},
				{
					expressions: [
						{ op: "greaterThanEqual", property: "height", value: 300 },
						{ op: "equal", property: "generatorPublicKey", value: "456" },
					],
					op: "and",
				},
			],
			op: "or",
		});
	});
});
