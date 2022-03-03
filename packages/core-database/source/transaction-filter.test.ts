import { Container } from "@arkecosystem/core-container";
import { Enums, Utils } from "@arkecosystem/crypto";

import { describe } from "../../core-test-framework";
import { TransactionFilter } from "./transaction-filter";

describe<{
	container: Container.Container;
	walletRepository: any;
}>("TransactionFilter.getExpression", ({ assert, beforeEach, it, stub }) => {
	beforeEach((context) => {
		context.walletRepository = {
			findByAddress: () => {},
		};

		context.container = new Container();
		context.container.bind(Identifiers.WalletRepository).toConstantValue(context.walletRepository);
	});

	it("should return true expression for TransactionCriteria.unknown", async (context) => {
		const transactionFilter = context.container.resolve(TransactionFilter);
		const expression = await transactionFilter.getExpression({ unknown: "123" } as any);

		assert.equal(expression, { op: "true" });
	});

	it("should compare senderPublicKey, recipientId, multipayment recipientId, delegate registration sender for TransactionCriteria.address", async (context) => {
		stub(context.walletRepository, "findByAddress").returnValue({
			getPublicKey: () => "456",
		});

		const transactionFilter = context.container.resolve(TransactionFilter);
		const expression = await transactionFilter.getExpression({ address: "123" });

		context.walletRepository.findByAddress.calledWith("123");
		assert.equal(expression, {
			expressions: [
				{ op: "equal", property: "senderPublicKey", value: "456" },
				{ op: "equal", property: "recipientId", value: "123" },
				{
					expressions: [
						{ op: "equal", property: "typeGroup", value: Enums.TransactionTypeGroup.Core },
						{ op: "equal", property: "type", value: Enums.TransactionType.MultiPayment },
						{ op: "contains", property: "asset", value: { payments: [{ recipientId: "123" }] } },
					],
					op: "and",
				},
				{
					expressions: [
						{ op: "equal", property: "typeGroup", value: Enums.TransactionTypeGroup.Core },
						{ op: "equal", property: "type", value: Enums.TransactionType.DelegateRegistration },
						{ op: "equal", property: "senderPublicKey", value: "456" },
					],
					op: "and",
				},
			],
			op: "or",
		});
	});

	it("should compare recipientId, multipayment recipientId when wallet not found for TransactionCriteria.address", async (context) => {
		stub(context.walletRepository, "findByAddress").returnValue({
			getPublicKey: () => {},
		});

		const transactionFilter = context.container.resolve(TransactionFilter);
		const expression = await transactionFilter.getExpression({ address: "123" });

		context.walletRepository.findByAddress.calledWith("123");
		assert.equal(expression, {
			expressions: [
				{ op: "equal", property: "recipientId", value: "123" },
				{
					expressions: [
						{ op: "equal", property: "typeGroup", value: Enums.TransactionTypeGroup.Core },
						{ op: "equal", property: "type", value: Enums.TransactionType.MultiPayment },
						{ op: "contains", property: "asset", value: { payments: [{ recipientId: "123" }] } },
					],
					op: "and",
				},
			],
			op: "or",
		});
	});

	it("should compare senderPublicKey using equal expression for TransactionCriteria.senderId", async (context) => {
		stub(context.walletRepository, "findByAddress").returnValue({
			getPublicKey: () => "456",
		});

		const transactionFilter = context.container.resolve(TransactionFilter);
		const expression = await transactionFilter.getExpression({ senderId: "123" });

		context.walletRepository.findByAddress.calledWith("123");
		assert.equal(expression, { op: "equal", property: "senderPublicKey", value: "456" });
	});

	it("should produce false expression when wallet not found for TransactionCriteria.senderId", async (context) => {
		stub(context.walletRepository, "findByAddress").returnValue({
			getPublicKey: () => {},
		});

		const transactionFilter = context.container.resolve(TransactionFilter);
		const expression = await transactionFilter.getExpression({ senderId: "123" });

		context.walletRepository.findByAddress.calledWith("123");
		assert.equal(expression, { op: "false" });
	});

	it("should compare using equal expression and include multipayment and include delegate registration transaction for TransactionCriteria.recipientId", async (context) => {
		stub(context.walletRepository, "findByAddress").returnValue({
			getPublicKey: () => "456",
		});

		const transactionFilter = context.container.resolve(TransactionFilter);
		const expression = await transactionFilter.getExpression({ recipientId: "123" });

		context.walletRepository.findByAddress.calledWith("123");
		assert.equal(expression, {
			expressions: [
				{ op: "equal", property: "recipientId", value: "123" },
				{
					expressions: [
						{ op: "equal", property: "typeGroup", value: Enums.TransactionTypeGroup.Core },
						{ op: "equal", property: "type", value: Enums.TransactionType.MultiPayment },
						{ op: "contains", property: "asset", value: { payments: [{ recipientId: "123" }] } },
					],
					op: "and",
				},
				{
					expressions: [
						{ op: "equal", property: "typeGroup", value: Enums.TransactionTypeGroup.Core },
						{ op: "equal", property: "type", value: Enums.TransactionType.DelegateRegistration },
						{ op: "equal", property: "senderPublicKey", value: "456" },
					],
					op: "and",
				},
			],
			op: "or",
		});
	});

	it("should compare using equal expression and include multipayment when wallet not found for TransactionCriteria.recipientId", async (context) => {
		stub(context.walletRepository, "findByAddress").returnValue({
			getPublicKey: () => {},
		});

		const transactionFilter = context.container.resolve(TransactionFilter);
		const expression = await transactionFilter.getExpression({ recipientId: "123" });

		context.walletRepository.findByAddress.calledWith("123");
		assert.equal(expression, {
			expressions: [
				{ op: "equal", property: "recipientId", value: "123" },
				{
					expressions: [
						{ op: "equal", property: "typeGroup", value: Enums.TransactionTypeGroup.Core },
						{ op: "equal", property: "type", value: Enums.TransactionType.MultiPayment },
						{ op: "contains", property: "asset", value: { payments: [{ recipientId: "123" }] } },
					],
					op: "and",
				},
			],
			op: "or",
		});
	});

	it("should compare using equal expression for TransactionCriteria.id", async (context) => {
		const transactionFilter = context.container.resolve(TransactionFilter);
		const expression = await transactionFilter.getExpression({ id: "123" });

		assert.equal(expression, { op: "equal", property: "id", value: "123" });
	});

	it("should compare using equal expression for TransactionCriteria.version", async (context) => {
		const transactionFilter = context.container.resolve(TransactionFilter);
		const expression = await transactionFilter.getExpression({ version: 2 });

		assert.equal(expression, { op: "equal", property: "version", value: 2 });
	});

	it("should compare using equal expression for TransactionCriteria.blockId", async (context) => {
		const transactionFilter = context.container.resolve(TransactionFilter);
		const expression = await transactionFilter.getExpression({ blockId: "123" });

		assert.equal(expression, { op: "equal", property: "blockId", value: "123" });
	});

	it("should compare using equal expression for TransactionCriteria.sequence", async (context) => {
		const transactionFilter = context.container.resolve(TransactionFilter);
		const expression = await transactionFilter.getExpression({ sequence: 5 });

		assert.equal(expression, { op: "equal", property: "sequence", value: 5 });
	});

	it("should compare using between expression for TransactionCriteria.sequence", async (context) => {
		const transactionFilter = context.container.resolve(TransactionFilter);
		const expression = await transactionFilter.getExpression({ sequence: { from: 5, to: 10 } });

		assert.equal(expression, { from: 5, op: "between", property: "sequence", to: 10 });
	});

	it("should compare using greater than equal expression for TransactionCriteria.sequence", async (context) => {
		const transactionFilter = context.container.resolve(TransactionFilter);
		const expression = await transactionFilter.getExpression({ sequence: { from: 5 } });

		assert.equal(expression, { op: "greaterThanEqual", property: "sequence", value: 5 });
	});

	it("should compare using less than equal expression for TransactionCriteria.sequence", async (context) => {
		const transactionFilter = context.container.resolve(TransactionFilter);
		const expression = await transactionFilter.getExpression({ sequence: { to: 5 } });

		assert.equal(expression, { op: "lessThanEqual", property: "sequence", value: 5 });
	});

	it("should compare using equal expression for TransactionCriteria.timestamp", async (context) => {
		const transactionFilter = context.container.resolve(TransactionFilter);
		const expression = await transactionFilter.getExpression({ timestamp: 3600 });

		assert.equal(expression, { op: "equal", property: "timestamp", value: 3600 });
	});

	it("should compare using between expression for TransactionCriteria.timestamp", async (context) => {
		const transactionFilter = context.container.resolve(TransactionFilter);
		const expression = await transactionFilter.getExpression({ timestamp: { from: 3600, to: 7200 } });

		assert.equal(expression, { from: 3600, op: "between", property: "timestamp", to: 7200 });
	});

	it("should compare using greater than equal expression for TransactionCriteria.timestamp", async (context) => {
		const transactionFilter = context.container.resolve(TransactionFilter);
		const expression = await transactionFilter.getExpression({ timestamp: { from: 3600 } });

		assert.equal(expression, { op: "greaterThanEqual", property: "timestamp", value: 3600 });
	});

	it("should compare using less than equal expression for TransactionCriteria.timestamp", async (context) => {
		const transactionFilter = context.container.resolve(TransactionFilter);
		const expression = await transactionFilter.getExpression({ timestamp: { to: 3600 } });

		assert.equal(expression, { op: "lessThanEqual", property: "timestamp", value: 3600 });
	});

	it("should compare using equal expression for TransactionCriteria.nonce", async (context) => {
		const transactionFilter = context.container.resolve(TransactionFilter);
		const expression = await transactionFilter.getExpression({ nonce: Utils.BigNumber.make("5") });

		assert.equal(expression, { op: "equal", property: "nonce", value: Utils.BigNumber.make("5") });
	});

	it("should compare using between expression for TransactionCriteria.nonce", async (context) => {
		const transactionFilter = context.container.resolve(TransactionFilter);
		const expression = await transactionFilter.getExpression({
			nonce: {
				from: Utils.BigNumber.make("5"),
				to: Utils.BigNumber.make("10"),
			},
		});

		assert.equal(expression, {
			from: Utils.BigNumber.make("5"),
			op: "between",
			property: "nonce",
			to: Utils.BigNumber.make("10"),
		});
	});

	it("should compare using greater than equal expression for TransactionCriteria.nonce", async (context) => {
		const transactionFilter = context.container.resolve(TransactionFilter);
		const expression = await transactionFilter.getExpression({
			nonce: {
				from: Utils.BigNumber.make("5"),
			},
		});

		assert.equal(expression, {
			op: "greaterThanEqual",
			property: "nonce",
			value: Utils.BigNumber.make("5"),
		});
	});

	it("should compare using less than equal expression for TransactionCriteria.nonce", async (context) => {
		const transactionFilter = context.container.resolve(TransactionFilter);
		const expression = await transactionFilter.getExpression({
			nonce: {
				to: Utils.BigNumber.make("5"),
			},
		});

		assert.equal(expression, {
			op: "lessThanEqual",
			property: "nonce",
			value: Utils.BigNumber.make("5"),
		});
	});

	it("should compare using equal expression for TransactionCriteria.senderPublicKey", async (context) => {
		const transactionFilter = context.container.resolve(TransactionFilter);
		const expression = await transactionFilter.getExpression({ senderPublicKey: "123" });

		assert.equal(expression, { op: "equal", property: "senderPublicKey", value: "123" });
	});

	it("should compare using equal expression and add core type group expression for TransactionCriteria.type", async (context) => {
		const transactionFilter = context.container.resolve(TransactionFilter);
		const expression = await transactionFilter.getExpression({ type: Enums.TransactionType.Vote });

		assert.equal(expression, {
			expressions: [
				{ op: "equal", property: "type", value: Enums.TransactionType.Vote },
				{ op: "equal", property: "typeGroup", value: Enums.TransactionTypeGroup.Core },
			],
			op: "and",
		});
	});

	it("should compare using equal expression and use existing type group expression for TransactionCriteria.type", async (context) => {
		const transactionFilter = context.container.resolve(TransactionFilter);
		const expression = await transactionFilter.getExpression({
			type: Enums.TransactionType.Vote,
			typeGroup: Enums.TransactionTypeGroup.Test,
		});

		assert.equal(expression, {
			expressions: [
				{ op: "equal", property: "type", value: Enums.TransactionType.Vote },
				{ op: "equal", property: "typeGroup", value: Enums.TransactionTypeGroup.Test },
			],
			op: "and",
		});
	});

	it("should compare using equal expression for TransactionCriteria.typeGroup", async (context) => {
		const transactionFilter = context.container.resolve(TransactionFilter);
		const expression = await transactionFilter.getExpression({ typeGroup: Enums.TransactionTypeGroup.Core });

		assert.equal(expression, {
			op: "equal",
			property: "typeGroup",
			value: Enums.TransactionTypeGroup.Core,
		});
	});

	it("should compare using like expression for TransactionCriteria.vendorField", async (context) => {
		const transactionFilter = context.container.resolve(TransactionFilter);
		const expression = await transactionFilter.getExpression({ vendorField: "%pattern%" });

		assert.equal(expression, {
			op: "like",
			pattern: "%pattern%",
			property: "vendorField",
		});
	});

	it("should compare using equal expression for TransactionCriteria.amount", async (context) => {
		const transactionFilter = context.container.resolve(TransactionFilter);
		const expression = await transactionFilter.getExpression({ amount: Utils.BigNumber.make("5000") });

		assert.equal(expression, { op: "equal", property: "amount", value: Utils.BigNumber.make("5000") });
	});

	it("should compare using between expression for TransactionCriteria.amount", async (context) => {
		const transactionFilter = context.container.resolve(TransactionFilter);
		const expression = await transactionFilter.getExpression({
			amount: {
				from: Utils.BigNumber.make("5000"),
				to: Utils.BigNumber.make("10000"),
			},
		});

		assert.equal(expression, {
			from: Utils.BigNumber.make("5000"),
			op: "between",
			property: "amount",
			to: Utils.BigNumber.make("10000"),
		});
	});

	it("should compare using greater than equal expression for TransactionCriteria.amount", async (context) => {
		const transactionFilter = context.container.resolve(TransactionFilter);
		const expression = await transactionFilter.getExpression({
			amount: {
				from: Utils.BigNumber.make("5000"),
			},
		});

		assert.equal(expression, {
			op: "greaterThanEqual",
			property: "amount",
			value: Utils.BigNumber.make("5000"),
		});
	});

	it("should compare using less than equal expression for TransactionCriteria.amount", async (context) => {
		const transactionFilter = context.container.resolve(TransactionFilter);
		const expression = await transactionFilter.getExpression({
			amount: {
				to: Utils.BigNumber.make("5000"),
			},
		});

		assert.equal(expression, {
			op: "lessThanEqual",
			property: "amount",
			value: Utils.BigNumber.make("5000"),
		});
	});

	it("should compare using equal expression for TransactionCriteria.fee", async (context) => {
		const transactionFilter = context.container.resolve(TransactionFilter);
		const expression = await transactionFilter.getExpression({ fee: Utils.BigNumber.make("500") });

		assert.equal(expression, { op: "equal", property: "fee", value: Utils.BigNumber.make("500") });
	});

	it("should compare using between expression for TransactionCriteria.fee", async (context) => {
		const transactionFilter = context.container.resolve(TransactionFilter);
		const expression = await transactionFilter.getExpression({
			fee: {
				from: Utils.BigNumber.make("500"),
				to: Utils.BigNumber.make("1000"),
			},
		});

		assert.equal(expression, {
			from: Utils.BigNumber.make("500"),
			op: "between",
			property: "fee",
			to: Utils.BigNumber.make("1000"),
		});
	});

	it("should compare using greater than equal expression for TransactionCriteria.fee", async (context) => {
		const transactionFilter = context.container.resolve(TransactionFilter);
		const expression = await transactionFilter.getExpression({
			fee: {
				from: Utils.BigNumber.make("500"),
			},
		});

		assert.equal(expression, {
			op: "greaterThanEqual",
			property: "fee",
			value: Utils.BigNumber.make("500"),
		});
	});

	it("should compare using less than equal expression for TransactionCriteria.fee", async (context) => {
		const transactionFilter = context.container.resolve(TransactionFilter);
		const expression = await transactionFilter.getExpression({
			fee: {
				to: Utils.BigNumber.make("500"),
			},
		});

		assert.equal(expression, {
			op: "lessThanEqual",
			property: "fee",
			value: Utils.BigNumber.make("500"),
		});
	});

	it("should compare using contains expression for TransactionCriteria.asset", async (context) => {
		const transactionFilter = context.container.resolve(TransactionFilter);
		const expression = await transactionFilter.getExpression({
			asset: { payments: [{ recipientId: "123a" }] },
		});

		assert.equal(expression, {
			op: "contains",
			property: "asset",
			value: { payments: [{ recipientId: "123a" }] },
		});
	});

	it("should compare using or contains expressions when asset has number string for TransactionCriteria.asset", async (context) => {
		const transactionFilter = context.container.resolve(TransactionFilter);
		const expression = await transactionFilter.getExpression({
			asset: { payments: [{ recipientId: "123" }] },
		});

		assert.equal(expression, {
			expressions: [
				{
					op: "contains",
					property: "asset",
					value: { payments: [{ recipientId: "123" }] },
				},
				{
					op: "contains",
					property: "asset",
					value: { payments: [{ recipientId: 123 }] },
				},
			],
			op: "or",
		});
	});

	it("should compare using or contains expressions when asset has boolean string for TransactionCriteria.asset", async (context) => {
		const transactionFilter = context.container.resolve(TransactionFilter);
		const expression = await transactionFilter.getExpression({
			asset: { flags: ["true"] },
		});

		assert.equal(expression, {
			expressions: [
				{
					op: "contains",
					property: "asset",
					value: { flags: ["true"] },
				},
				{
					op: "contains",
					property: "asset",
					value: { flags: [true] },
				},
			],
			op: "or",
		});
	});

	it("should compare using or combination of contains expressions when asset has boolean and number string for TransactionCriteria.asset", async (context) => {
		const transactionFilter = context.container.resolve(TransactionFilter);
		const expression = await transactionFilter.getExpression({
			asset: {
				flags: ["true", "false"],
				recipientId: "123",
			},
		});

		assert.equal(expression, {
			expressions: [
				{
					op: "contains",
					property: "asset",
					value: {
						flags: ["true", "false"],
						recipientId: "123",
					},
				},
				{
					op: "contains",
					property: "asset",
					value: {
						flags: ["true", false],
						recipientId: "123",
					},
				},
				{
					op: "contains",
					property: "asset",
					value: {
						flags: [true, "false"],
						recipientId: "123",
					},
				},
				{
					op: "contains",
					property: "asset",
					value: {
						flags: [true, false],
						recipientId: "123",
					},
				},
				{
					op: "contains",
					property: "asset",
					value: {
						flags: ["true", "false"],
						recipientId: 123,
					},
				},
				{
					op: "contains",
					property: "asset",
					value: {
						flags: ["true", false],
						recipientId: 123,
					},
				},
				{
					op: "contains",
					property: "asset",
					value: {
						flags: [true, "false"],
						recipientId: 123,
					},
				},
				{
					op: "contains",
					property: "asset",
					value: {
						flags: [true, false],
						recipientId: 123,
					},
				},
			],
			op: "or",
		});
	});

	it("should throw when there are to many number string combinations for TransactionCriteria.asset", async (context) => {
		const transactionFilter = context.container.resolve(TransactionFilter);
		const criteria = {
			asset: { recipientId: ["1", "2", "3", "4", "5", "6"] },
		};

		await assert.rejects(() => transactionFilter.getExpression(criteria), "Asset cast property limit reached");
	});

	it("should throw when there are to many boolean string combinations for TransactionCriteria.asset", async (context) => {
		const transactionFilter = context.container.resolve(TransactionFilter);
		const criteria = {
			asset: { recipientId: ["true", "true", "true", "false", "false", "false"] },
		};

		await assert.rejects(() => transactionFilter.getExpression(criteria), "Asset cast property limit reached");
	});

	it("should throw when there are to many number or boolean string combinations for TransactionCriteria.asset", async (context) => {
		const transactionFilter = context.container.resolve(TransactionFilter);
		const criteria = {
			asset: { recipientId: ["true", "1", "2", "false", "3", "4"] },
		};

		await assert.rejects(() => transactionFilter.getExpression(criteria), "Asset cast property limit reached");
	});

	it("should join using and expression for TransactionCriteria.amount and TransactionCriteria.senderPublicKey", async (context) => {
		const transactionFilter = context.container.resolve(TransactionFilter);
		const expression = await transactionFilter.getExpression({
			amount: { from: Utils.BigNumber.make("10000") },
			senderPublicKey: "123",
		});

		assert.equal(expression, {
			expressions: [
				{ op: "greaterThanEqual", property: "amount", value: Utils.BigNumber.make("10000") },
				{ op: "equal", property: "senderPublicKey", value: "123" },
			],
			op: "and",
		});
	});

	it("should join using or expression (OrTransactionCriteria)", async (context) => {
		const transactionFilter = context.container.resolve(TransactionFilter);
		const expression = await transactionFilter.getExpression([
			{ amount: { from: Utils.BigNumber.make("10000") }, senderPublicKey: "123" },
			{ amount: { from: Utils.BigNumber.make("30000") }, senderPublicKey: "456" },
		]);

		assert.equal(expression, {
			expressions: [
				{
					expressions: [
						{ op: "greaterThanEqual", property: "amount", value: Utils.BigNumber.make("10000") },
						{ op: "equal", property: "senderPublicKey", value: "123" },
					],
					op: "and",
				},
				{
					expressions: [
						{ op: "greaterThanEqual", property: "amount", value: Utils.BigNumber.make("30000") },
						{ op: "equal", property: "senderPublicKey", value: "456" },
					],
					op: "and",
				},
			],
			op: "or",
		});
	});
});
