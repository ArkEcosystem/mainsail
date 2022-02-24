import { TransactionFilter } from "./transaction-filter";
import { Container } from "@arkecosystem/core-kernel";
import { Enums, Utils } from "@arkecosystem/crypto";
import { describe } from "../../core-test-framework";

describe<{
	container: Container.Container;
	walletRepository: any;
}>("TransactionFilter.getExpression", ({ assert, beforeEach, it, stub }) => {
	beforeEach((context) => {
		context.walletRepository = {
			findByAddress: () => undefined,
		};

		context.container = new Container.Container();
		context.container.bind(Container.Identifiers.WalletRepository).toConstantValue(context.walletRepository);
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
			op: "or",
			expressions: [
				{ property: "senderPublicKey", op: "equal", value: "456" },
				{ property: "recipientId", op: "equal", value: "123" },
				{
					op: "and",
					expressions: [
						{ property: "typeGroup", op: "equal", value: Enums.TransactionTypeGroup.Core },
						{ property: "type", op: "equal", value: Enums.TransactionType.MultiPayment },
						{ property: "asset", op: "contains", value: { payments: [{ recipientId: "123" }] } },
					],
				},
				{
					op: "and",
					expressions: [
						{ property: "typeGroup", op: "equal", value: Enums.TransactionTypeGroup.Core },
						{ property: "type", op: "equal", value: Enums.TransactionType.DelegateRegistration },
						{ property: "senderPublicKey", op: "equal", value: "456" },
					],
				},
			],
		});
	});

	it("should compare recipientId, multipayment recipientId when wallet not found for TransactionCriteria.address", async (context) => {
		stub(context.walletRepository, "findByAddress").returnValue({
			getPublicKey: () => undefined,
		});

		const transactionFilter = context.container.resolve(TransactionFilter);
		const expression = await transactionFilter.getExpression({ address: "123" });

		context.walletRepository.findByAddress.calledWith("123");
		assert.equal(expression, {
			op: "or",
			expressions: [
				{ property: "recipientId", op: "equal", value: "123" },
				{
					op: "and",
					expressions: [
						{ property: "typeGroup", op: "equal", value: Enums.TransactionTypeGroup.Core },
						{ property: "type", op: "equal", value: Enums.TransactionType.MultiPayment },
						{ property: "asset", op: "contains", value: { payments: [{ recipientId: "123" }] } },
					],
				},
			],
		});
	});

	it("should compare senderPublicKey using equal expression for TransactionCriteria.senderId", async (context) => {
		stub(context.walletRepository, "findByAddress").returnValue({
			getPublicKey: () => "456",
		});

		const transactionFilter = context.container.resolve(TransactionFilter);
		const expression = await transactionFilter.getExpression({ senderId: "123" });

		context.walletRepository.findByAddress.calledWith("123");
		assert.equal(expression, { property: "senderPublicKey", op: "equal", value: "456" });
	});

	it("should produce false expression when wallet not found for TransactionCriteria.senderId", async (context) => {
		stub(context.walletRepository, "findByAddress").returnValue({
			getPublicKey: () => undefined,
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
			op: "or",
			expressions: [
				{ property: "recipientId", op: "equal", value: "123" },
				{
					op: "and",
					expressions: [
						{ property: "typeGroup", op: "equal", value: Enums.TransactionTypeGroup.Core },
						{ property: "type", op: "equal", value: Enums.TransactionType.MultiPayment },
						{ property: "asset", op: "contains", value: { payments: [{ recipientId: "123" }] } },
					],
				},
				{
					op: "and",
					expressions: [
						{ property: "typeGroup", op: "equal", value: Enums.TransactionTypeGroup.Core },
						{ property: "type", op: "equal", value: Enums.TransactionType.DelegateRegistration },
						{ property: "senderPublicKey", op: "equal", value: "456" },
					],
				},
			],
		});
	});

	it("should compare using equal expression and include multipayment when wallet not found for TransactionCriteria.recipientId", async (context) => {
		stub(context.walletRepository, "findByAddress").returnValue({
			getPublicKey: () => undefined,
		});

		const transactionFilter = context.container.resolve(TransactionFilter);
		const expression = await transactionFilter.getExpression({ recipientId: "123" });

		context.walletRepository.findByAddress.calledWith("123");
		assert.equal(expression, {
			op: "or",
			expressions: [
				{ property: "recipientId", op: "equal", value: "123" },
				{
					op: "and",
					expressions: [
						{ property: "typeGroup", op: "equal", value: Enums.TransactionTypeGroup.Core },
						{ property: "type", op: "equal", value: Enums.TransactionType.MultiPayment },
						{ property: "asset", op: "contains", value: { payments: [{ recipientId: "123" }] } },
					],
				},
			],
		});
	});

	it("should compare using equal expression for TransactionCriteria.id", async (context) => {
		const transactionFilter = context.container.resolve(TransactionFilter);
		const expression = await transactionFilter.getExpression({ id: "123" });

		assert.equal(expression, { property: "id", op: "equal", value: "123" });
	});

	it("should compare using equal expression for TransactionCriteria.version", async (context) => {
		const transactionFilter = context.container.resolve(TransactionFilter);
		const expression = await transactionFilter.getExpression({ version: 2 });

		assert.equal(expression, { property: "version", op: "equal", value: 2 });
	});

	it("should compare using equal expression for TransactionCriteria.blockId", async (context) => {
		const transactionFilter = context.container.resolve(TransactionFilter);
		const expression = await transactionFilter.getExpression({ blockId: "123" });

		assert.equal(expression, { property: "blockId", op: "equal", value: "123" });
	});

	it("should compare using equal expression for TransactionCriteria.sequence", async (context) => {
		const transactionFilter = context.container.resolve(TransactionFilter);
		const expression = await transactionFilter.getExpression({ sequence: 5 });

		assert.equal(expression, { property: "sequence", op: "equal", value: 5 });
	});

	it("should compare using between expression for TransactionCriteria.sequence", async (context) => {
		const transactionFilter = context.container.resolve(TransactionFilter);
		const expression = await transactionFilter.getExpression({ sequence: { from: 5, to: 10 } });

		assert.equal(expression, { property: "sequence", op: "between", from: 5, to: 10 });
	});

	it("should compare using greater than equal expression for TransactionCriteria.sequence", async (context) => {
		const transactionFilter = context.container.resolve(TransactionFilter);
		const expression = await transactionFilter.getExpression({ sequence: { from: 5 } });

		assert.equal(expression, { property: "sequence", op: "greaterThanEqual", value: 5 });
	});

	it("should compare using less than equal expression for TransactionCriteria.sequence", async (context) => {
		const transactionFilter = context.container.resolve(TransactionFilter);
		const expression = await transactionFilter.getExpression({ sequence: { to: 5 } });

		assert.equal(expression, { property: "sequence", op: "lessThanEqual", value: 5 });
	});

	it("should compare using equal expression for TransactionCriteria.timestamp", async (context) => {
		const transactionFilter = context.container.resolve(TransactionFilter);
		const expression = await transactionFilter.getExpression({ timestamp: 3600 });

		assert.equal(expression, { property: "timestamp", op: "equal", value: 3600 });
	});

	it("should compare using between expression for TransactionCriteria.timestamp", async (context) => {
		const transactionFilter = context.container.resolve(TransactionFilter);
		const expression = await transactionFilter.getExpression({ timestamp: { from: 3600, to: 7200 } });

		assert.equal(expression, { property: "timestamp", op: "between", from: 3600, to: 7200 });
	});

	it("should compare using greater than equal expression for TransactionCriteria.timestamp", async (context) => {
		const transactionFilter = context.container.resolve(TransactionFilter);
		const expression = await transactionFilter.getExpression({ timestamp: { from: 3600 } });

		assert.equal(expression, { property: "timestamp", op: "greaterThanEqual", value: 3600 });
	});

	it("should compare using less than equal expression for TransactionCriteria.timestamp", async (context) => {
		const transactionFilter = context.container.resolve(TransactionFilter);
		const expression = await transactionFilter.getExpression({ timestamp: { to: 3600 } });

		assert.equal(expression, { property: "timestamp", op: "lessThanEqual", value: 3600 });
	});

	it("should compare using equal expression for TransactionCriteria.nonce", async (context) => {
		const transactionFilter = context.container.resolve(TransactionFilter);
		const expression = await transactionFilter.getExpression({ nonce: Utils.BigNumber.make("5") });

		assert.equal(expression, { property: "nonce", op: "equal", value: Utils.BigNumber.make("5") });
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
			property: "nonce",
			op: "between",
			from: Utils.BigNumber.make("5"),
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
			property: "nonce",
			op: "greaterThanEqual",
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
			property: "nonce",
			op: "lessThanEqual",
			value: Utils.BigNumber.make("5"),
		});
	});

	it("should compare using equal expression for TransactionCriteria.senderPublicKey", async (context) => {
		const transactionFilter = context.container.resolve(TransactionFilter);
		const expression = await transactionFilter.getExpression({ senderPublicKey: "123" });

		assert.equal(expression, { property: "senderPublicKey", op: "equal", value: "123" });
	});

	it("should compare using equal expression and add core type group expression for TransactionCriteria.type", async (context) => {
		const transactionFilter = context.container.resolve(TransactionFilter);
		const expression = await transactionFilter.getExpression({ type: Enums.TransactionType.Vote });

		assert.equal(expression, {
			op: "and",
			expressions: [
				{ property: "type", op: "equal", value: Enums.TransactionType.Vote },
				{ property: "typeGroup", op: "equal", value: Enums.TransactionTypeGroup.Core },
			],
		});
	});

	it("should compare using equal expression and use existing type group expression for TransactionCriteria.type", async (context) => {
		const transactionFilter = context.container.resolve(TransactionFilter);
		const expression = await transactionFilter.getExpression({
			type: Enums.TransactionType.Vote,
			typeGroup: Enums.TransactionTypeGroup.Test,
		});

		assert.equal(expression, {
			op: "and",
			expressions: [
				{ property: "type", op: "equal", value: Enums.TransactionType.Vote },
				{ property: "typeGroup", op: "equal", value: Enums.TransactionTypeGroup.Test },
			],
		});
	});

	it("should compare using equal expression for TransactionCriteria.typeGroup", async (context) => {
		const transactionFilter = context.container.resolve(TransactionFilter);
		const expression = await transactionFilter.getExpression({ typeGroup: Enums.TransactionTypeGroup.Core });

		assert.equal(expression, {
			property: "typeGroup",
			op: "equal",
			value: Enums.TransactionTypeGroup.Core,
		});
	});

	it("should compare using like expression for TransactionCriteria.vendorField", async (context) => {
		const transactionFilter = context.container.resolve(TransactionFilter);
		const expression = await transactionFilter.getExpression({ vendorField: "%pattern%" });

		assert.equal(expression, {
			property: "vendorField",
			op: "like",
			pattern: "%pattern%",
		});
	});

	it("should compare using equal expression for TransactionCriteria.amount", async (context) => {
		const transactionFilter = context.container.resolve(TransactionFilter);
		const expression = await transactionFilter.getExpression({ amount: Utils.BigNumber.make("5000") });

		assert.equal(expression, { property: "amount", op: "equal", value: Utils.BigNumber.make("5000") });
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
			property: "amount",
			op: "between",
			from: Utils.BigNumber.make("5000"),
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
			property: "amount",
			op: "greaterThanEqual",
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
			property: "amount",
			op: "lessThanEqual",
			value: Utils.BigNumber.make("5000"),
		});
	});

	it("should compare using equal expression for TransactionCriteria.fee", async (context) => {
		const transactionFilter = context.container.resolve(TransactionFilter);
		const expression = await transactionFilter.getExpression({ fee: Utils.BigNumber.make("500") });

		assert.equal(expression, { property: "fee", op: "equal", value: Utils.BigNumber.make("500") });
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
			property: "fee",
			op: "between",
			from: Utils.BigNumber.make("500"),
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
			property: "fee",
			op: "greaterThanEqual",
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
			property: "fee",
			op: "lessThanEqual",
			value: Utils.BigNumber.make("500"),
		});
	});

	it("should compare using contains expression for TransactionCriteria.asset", async (context) => {
		const transactionFilter = context.container.resolve(TransactionFilter);
		const expression = await transactionFilter.getExpression({
			asset: { payments: [{ recipientId: "123a" }] },
		});

		assert.equal(expression, {
			property: "asset",
			op: "contains",
			value: { payments: [{ recipientId: "123a" }] },
		});
	});

	it("should compare using or contains expressions when asset has number string for TransactionCriteria.asset", async (context) => {
		const transactionFilter = context.container.resolve(TransactionFilter);
		const expression = await transactionFilter.getExpression({
			asset: { payments: [{ recipientId: "123" }] },
		});

		assert.equal(expression, {
			op: "or",
			expressions: [
				{
					property: "asset",
					op: "contains",
					value: { payments: [{ recipientId: "123" }] },
				},
				{
					property: "asset",
					op: "contains",
					value: { payments: [{ recipientId: 123 }] },
				},
			],
		});
	});

	it("should compare using or contains expressions when asset has boolean string for TransactionCriteria.asset", async (context) => {
		const transactionFilter = context.container.resolve(TransactionFilter);
		const expression = await transactionFilter.getExpression({
			asset: { flags: ["true"] },
		});

		assert.equal(expression, {
			op: "or",
			expressions: [
				{
					property: "asset",
					op: "contains",
					value: { flags: ["true"] },
				},
				{
					property: "asset",
					op: "contains",
					value: { flags: [true] },
				},
			],
		});
	});

	it("should compare using or combination of contains expressions when asset has boolean and number string for TransactionCriteria.asset", async (context) => {
		const transactionFilter = context.container.resolve(TransactionFilter);
		const expression = await transactionFilter.getExpression({
			asset: {
				recipientId: "123",
				flags: ["true", "false"],
			},
		});

		assert.equal(expression, {
			op: "or",
			expressions: [
				{
					property: "asset",
					op: "contains",
					value: {
						recipientId: "123",
						flags: ["true", "false"],
					},
				},
				{
					property: "asset",
					op: "contains",
					value: {
						recipientId: "123",
						flags: ["true", false],
					},
				},
				{
					property: "asset",
					op: "contains",
					value: {
						recipientId: "123",
						flags: [true, "false"],
					},
				},
				{
					property: "asset",
					op: "contains",
					value: {
						recipientId: "123",
						flags: [true, false],
					},
				},
				{
					property: "asset",
					op: "contains",
					value: {
						recipientId: 123,
						flags: ["true", "false"],
					},
				},
				{
					property: "asset",
					op: "contains",
					value: {
						recipientId: 123,
						flags: ["true", false],
					},
				},
				{
					property: "asset",
					op: "contains",
					value: {
						recipientId: 123,
						flags: [true, "false"],
					},
				},
				{
					property: "asset",
					op: "contains",
					value: {
						recipientId: 123,
						flags: [true, false],
					},
				},
			],
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
			op: "and",
			expressions: [
				{ property: "amount", op: "greaterThanEqual", value: Utils.BigNumber.make("10000") },
				{ property: "senderPublicKey", op: "equal", value: "123" },
			],
		});
	});

	it("should join using or expression (OrTransactionCriteria)", async (context) => {
		const transactionFilter = context.container.resolve(TransactionFilter);
		const expression = await transactionFilter.getExpression([
			{ amount: { from: Utils.BigNumber.make("10000") }, senderPublicKey: "123" },
			{ amount: { from: Utils.BigNumber.make("30000") }, senderPublicKey: "456" },
		]);

		assert.equal(expression, {
			op: "or",
			expressions: [
				{
					op: "and",
					expressions: [
						{ property: "amount", op: "greaterThanEqual", value: Utils.BigNumber.make("10000") },
						{ property: "senderPublicKey", op: "equal", value: "123" },
					],
				},
				{
					op: "and",
					expressions: [
						{ property: "amount", op: "greaterThanEqual", value: Utils.BigNumber.make("30000") },
						{ property: "senderPublicKey", op: "equal", value: "456" },
					],
				},
			],
		});
	});
});
