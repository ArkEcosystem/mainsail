import { describe, Factories, Generators } from "@arkecosystem/core-test-framework";
import ajv from "ajv";

import { IBlock, ITransactionData } from "../interfaces";
import { configManager } from "../managers";
import { TransactionTypeFactory } from "../transactions";
import { TransactionSchema } from "../transactions/types/schemas";
import { BigNumber } from "../utils";
import { validator } from "../validation";

describe("validator", ({ it, assert }) => {
	it("transaction - should expect a timestamp if version = 1 or absent", () => {
		const transaction = {
			amount: BigNumber.make(1000),
			asset: {},
			fee: BigNumber.make(2000),
			id: "943c220691e711c39c79d437ce185748a0018940e1a4144293af9d05627d2eb4",
			recipientId: "DTRdbaUW3RQQSL5By4G43JVaeHiqfVp9oh",
			senderPublicKey: "034da006f958beba78ec54443df4a3f52237253f7ae8cbdb17dccf3feaa57f3126",
			signature:
				"618a54975212ead93df8c881655c625544bce8ed7ccdfe6f08a42eecfb1adebd051307be5014bb051617baf7815d50f62129e70918190361e5d4dd4796541b0a",
			type: 0,
		} as ITransactionData;

		assert.equal(
			validator.validate("transferSigned", transaction).error,
			"data must have required property 'timestamp'",
		);

		transaction.version = 1;
		assert.equal(
			validator.validate("transferSigned", transaction).error,
			"data must have required property 'timestamp'",
		);

		transaction.timestamp = 12_222;
		assert.undefined(validator.validate("transferSigned", transaction).error);
	});

	it("transaction - should expect a nonce if version = 2 or higher", () => {
		const transaction = {
			amount: BigNumber.make(1000),
			asset: {},
			fee: BigNumber.make(2000),
			id: "943c220691e711c39c79d437ce185748a0018940e1a4144293af9d05627d2eb4",
			recipientId: "DTRdbaUW3RQQSL5By4G43JVaeHiqfVp9oh",
			senderPublicKey: "034da006f958beba78ec54443df4a3f52237253f7ae8cbdb17dccf3feaa57f3126",
			signature:
				"618a54975212ead93df8c881655c625544bce8ed7ccdfe6f08a42eecfb1adebd051307be5014bb051617baf7815d50f62129e70918190361e5d4dd4796541b0a",
			type: 0,
		} as ITransactionData;

		transaction.version = 2;

		assert.equal(
			validator.validate("transferSigned", transaction).error,
			"data must have required property 'nonce'",
		);

		transaction.nonce = BigNumber.ZERO;
		assert.undefined(validator.validate("transferSigned", transaction).error);
	});

	it("validate - transaction", () => {
		const transaction = {
			amount: BigNumber.make(1000),
			asset: {},
			fee: BigNumber.make(2000),
			id: "943c220691e711c39c79d437ce185748a0018940e1a4144293af9d05627d2eb4",
			recipientId: "DTRdbaUW3RQQSL5By4G43JVaeHiqfVp9oh",
			senderPublicKey: "034da006f958beba78ec54443df4a3f52237253f7ae8cbdb17dccf3feaa57f3126",
			signature:
				"618a54975212ead93df8c881655c625544bce8ed7ccdfe6f08a42eecfb1adebd051307be5014bb051617baf7815d50f62129e70918190361e5d4dd4796541b0a",
			timestamp: 141_738,
			type: 0,
		};

		assert.undefined(validator.validate("transferSigned", transaction).error);
	});

	it("validate - publicKey - should be ok", () => {
		assert.undefined(
			validator.validate("publicKey", "034da006f958beba78ec54443df4a3f52237253f7ae8cbdb17dccf3feaa57f3126").error,
		);
	});

	it("validate - publicKey - should not be ok", () => {
		assert.defined(
			validator.validate("publicKey", "Z34da006f958beba78ec54443df4a3f52237253f7ae8cbdb17dccf3feaa57f3126").error,
		);
		assert.defined(
			validator.validate("publicKey", "34da006f958beba78ec54443df4a3f52237253f7ae8cbdb17dccf3feaa57f3126").error,
		);
		assert.defined(validator.validate("publicKey", "").error);
		assert.defined(validator.validate("publicKey", 1234).error);
		assert.defined(validator.validate("publicKey", null).error);
		assert.defined(validator.validate("publicKey").error);
	});

	it("validate - address - should be ok", () => {
		assert.undefined(validator.validate("address", "DTRdbaUW3RQQSL5By4G43JVaeHiqfVp9oh").error);
	});

	it("validate - address - should not be ok", () => {
		assert.defined(validator.validate("address", "€TRdbaUW3RQQSL5By4G43JVaeHiqfVp9oh").error);
		assert.defined(validator.validate("address", "DTRdbaUW3RQQSL5By4G43JVaeHiqfVp9").error);
		assert.defined(
			validator.validate("address", "034da006f958beba78ec54443df4a3f52237253f7ae8cbdb17dccf3feaa57f3126").error,
		);
		assert.defined(validator.validate("address", "").error);
		assert.defined(validator.validate("address", 1234).error);
		assert.defined(validator.validate("address", null).error);
		assert.defined(validator.validate("address").error);
	});

	it("validate - hex - should be ok", () => {
		assert.undefined(validator.validate("hex", "deadbeef").error);
	});

	it("validate - hex - should not be ok", () => {
		assert.defined(validator.validate("hex", "€").error);
		assert.defined(validator.validate("hex", 1).error);
		assert.defined(validator.validate("hex", "").error);
		assert.defined(validator.validate("hex", null).error);
		assert.defined(validator.validate("hex").error);
	});

	it("validate - base58 - should be ok", () => {
		assert.undefined(validator.validate("base58", "DTRdbaUW3RQQSL5By4G43JVaeHiqfVp9").error);
	});

	it("validate - base58 - should not be ok", () => {
		assert.defined(validator.validate("base58", "€").error);
		assert.defined(validator.validate("base58", 1).error);
		assert.defined(validator.validate("base58", "").error);
		assert.defined(validator.validate("base58", null).error);
		assert.defined(validator.validate("base58").error);
	});

	it("validate - alphanumeric - should be ok", () => {
		assert.undefined(validator.validate("alphanumeric", "abcDE1234").error);
	});

	it("validate - alphanumeric - should not be ok", () => {
		assert.defined(validator.validate("alphanumeric", "+12").error);
		assert.defined(validator.validate("alphanumeric", ".1").error);
		assert.defined(validator.validate("alphanumeric", "1.0").error);
		assert.defined(validator.validate("alphanumeric", "€").error);
		assert.defined(validator.validate("alphanumeric", 1).error);
		assert.defined(validator.validate("alphanumeric", "").error);
		assert.defined(validator.validate("alphanumeric", null).error);
		assert.defined(validator.validate("alphanumeric").error);
	});

	it("validate - transactionId - should be ok", () => {
		assert.undefined(
			validator.validate("transactionId", "943c220691e711c39c79d437ce185748a0018940e1a4144293af9d05627d2eb4")
				.error,
		);
	});

	it("validate - transactionId - should not be ok", () => {
		assert.defined(
			validator.validate("transactionId", "94c220691e711c39c79d437ce185748a0018940e1a4144293af9d05627d2eb4")
				.error,
		);
		assert.defined(
			validator.validate("transactionId", "94c220691e711c39c79d437ce185748a0018940e1a4144293af9d05627d2eb4111")
				.error,
		);
		assert.defined(
			validator.validate("transactionId", "94c220691e711c39c79d437ce185748a0018940e1a4144293af9d05627d2eb4@@@")
				.error,
		);
		assert.defined(validator.validate("transactionId", 1).error);
		assert.defined(validator.validate("transactionId", "").error);
		assert.defined(validator.validate("transactionId", null).error);
		assert.defined(validator.validate("transactionId").error);
	});

	it("validate - walletVote - should be ok", () => {
		assert.undefined(
			validator.validate("walletVote", "+034da006f958beba78ec54443df4a3f52237253f7ae8cbdb17dccf3feaa57f3126")
				.error,
		);

		assert.undefined(
			validator.validate("walletVote", "-034da006f958beba78ec54443df4a3f52237253f7ae8cbdb17dccf3feaa57f3126")
				.error,
		);
	});

	it("validate - walletVote - should not be ok", () => {
		assert.defined(
			validator.validate("walletVote", "034da006f958beba78ec54443df4a3f52237253f7ae8cbdb17dccf3feaa57f3126")
				.error,
		);
		assert.defined(validator.validate("walletVote", "-^sd").error);
		assert.defined(validator.validate("walletVote", 1234).error);
		assert.defined(validator.validate("walletVote", "").error);
		assert.defined(validator.validate("walletVote", null).error);
		assert.defined(validator.validate("walletVote").error);
	});

	it("validate - delegateUsername - should be ok", () => {
		assert.undefined(validator.validate("delegateUsername", "asdf").error);
		assert.undefined(validator.validate("delegateUsername", "_").error);
	});

	it("validate - delegateUsername - should not be ok", () => {
		assert.defined(validator.validate("delegateUsername", "AbCdEfG").error);
		assert.defined(validator.validate("delegateUsername", "longerthantwentycharacterslong").error);
		assert.defined(validator.validate("delegateUsername", 1234).error);
		assert.defined(validator.validate("delegateUsername", "").error);
		assert.defined(validator.validate("delegateUsername", null).error);
		assert.defined(validator.validate("delegateUsername").error);
	});

	it("block should be ok", () => {
		TransactionTypeFactory.get(0); // Make sure registry is loaded, since it adds the "transactions" schema.

		// todo: completely wrap this into a function to hide the generation and setting of the config?
		configManager.setConfig(Generators.generateCryptoConfigRaw());

		const block: IBlock = Factories.factory("Block")
			.withOptions({
				config: configManager.all(),
				nonce: "0",
				transactionsCount: 10,
			})
			.make();

		assert.undefined(validator.validate("block", block.toJson()).error);
		assert.undefined(validator.validate("block", configManager.get("genesisBlock")).error);
	});

	it("block should not be ok", () => {
		TransactionTypeFactory.get(0); // Make sure registry is loaded, since it adds the "transactions" schema.

		// todo: completely wrap this into a function to hide the generation and setting of the config?
		configManager.setConfig(Generators.generateCryptoConfigRaw());

		const block: IBlock = Factories.factory("Block")
			.withOptions({
				config: configManager.all(),
				nonce: "0",
				transactionsCount: 10,
			})
			.make();

		block.data.numberOfTransactions = 1;
		assert.defined(validator.validate("block", block.toJson()).error);
		block.data.numberOfTransactions = 11;
		assert.defined(validator.validate("block", block.toJson()).error);
		block.data.numberOfTransactions = 10;
		assert.undefined(validator.validate("block", block.toJson()).error);
		block.transactions[0] = {} as any;
		assert.defined(validator.validate("block", block).error);
		block.transactions[0] = 1234 as any;
		assert.defined(validator.validate("block", block).error);
	});

	it("should extend transaction schema", () => {
		const customTransactionSchema = { $id: "custom" } as TransactionSchema;
		validator.extendTransaction(customTransactionSchema);

		assert.defined(validator.getInstance().getSchema("custom"));
	});

	it("should return the instance", () => {
		assert.instance(validator.getInstance(), ajv);
	});
});
