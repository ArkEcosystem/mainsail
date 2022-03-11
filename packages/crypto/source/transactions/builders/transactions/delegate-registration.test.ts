import { describe, Generators } from "@arkecosystem/core-test-framework";
import { BigNumber } from "../../../utils/bignum";
import { TransactionType } from "../../../enums";
import { configManager } from "../../../managers";
import { BuilderFactory } from "../../index";
import { Two } from "../../types";
import { NetworkConfig } from "../../../interfaces";
import { DelegateRegistrationBuilder } from "./delegate-registration";
import { Utils } from "../../utils";

describe<{
	config: NetworkConfig;
	builder: DelegateRegistrationBuilder;
}>("Delegate Registration Transaction", ({ it, assert, beforeAll, beforeEach, afterAll }) => {
	beforeAll((context) => {
		context.config = configManager.all();

		// todo: completely wrap this into a function to hide the generation and setting of the config?
		const config = Generators.generateCryptoConfigRaw();
		configManager.setConfig(config);
	});

	beforeEach((context) => {
		context.builder = BuilderFactory.delegateRegistration();
	});

	afterAll((context) => {
		configManager.setConfig(context.config);
	});

	it("verify - should be valid with a signature", (context) => {
		const actual = context.builder.usernameAsset("homer").sign("dummy passphrase");

		assert.true(actual.build().verified);
		assert.true(actual.verify());
	});

	it("verify - should be valid with a second signature", (context) => {
		const actual = context.builder.usernameAsset("homer").sign("dummy passphrase");

		assert.true(actual.build().verified);
		assert.true(actual.verify());
	});

	it("properties - should have its specific properties", (context) => {
		assert.equal(context.builder.data.type, TransactionType.DelegateRegistration);
		assert.equal(context.builder.data.amount, BigNumber.ZERO);
		assert.equal(context.builder.data.fee, Two.DelegateRegistrationTransaction.staticFee());
		assert.equal(context.builder.data.recipientId, undefined);
		assert.equal(context.builder.data.senderPublicKey, undefined);
		assert.equal(context.builder.data.asset, { delegate: {} });
	});

	it("properties - should not have the username yet", (context) => {
		assert.false(context.builder.data.hasOwnProperty("username"));
	});

	it("usernameAsset - establishes the username of the asset", (context) => {
		context.builder.usernameAsset("homer");

		assert.equal(context.builder.data.asset.delegate.username, "homer");
	});

	// FIXME problems with ark-js V1
	// note: this will only work with v1 transactions as v2 transactions don't have a timestamp
	it("getStruct - should fail if the transaction is not signed", (context) => {
		context.builder.usernameAsset("homer");

		assert.throws(() => context.builder.getStruct());
	});

	it("getStruct - when is signed it returns the id", (context) => {
		context.builder.usernameAsset("homer");

		configManager.getMilestone().aip11 = false;

		context.builder.version(1).sign("any pass");

		assert.equal(context.builder.getStruct().id, Utils.getId(context.builder.data));
	});

	it("getStruct - when is signed it returns the signature", (context) => {
		context.builder.usernameAsset("homer");

		configManager.getMilestone().aip11 = false;

		context.builder.version(1).sign("any pass");

		assert.equal(context.builder.getStruct().signature, context.builder.data.signature);
	});

	it("getStruct - when is signed it returns the timestamp", (context) => {
		context.builder.usernameAsset("homer");

		configManager.getMilestone().aip11 = false;

		context.builder.version(1).sign("any pass");

		assert.equal(context.builder.getStruct().timestamp, context.builder.data.timestamp);
	});

	it("getStruct - when is signed it returns the transaction type", (context) => {
		context.builder.usernameAsset("homer");

		configManager.getMilestone().aip11 = false;

		context.builder.version(1).sign("any pass");

		assert.equal(context.builder.getStruct().type, context.builder.data.type);
	});

	it("getStruct - when is signed it returns the fee", (context) => {
		context.builder.usernameAsset("homer");

		configManager.getMilestone().aip11 = false;

		context.builder.version(1).sign("any pass");

		assert.equal(context.builder.getStruct().fee, context.builder.data.fee);
	});

	it("getStruct - when is signed it returns the sender public key", (context) => {
		context.builder.usernameAsset("homer");

		configManager.getMilestone().aip11 = false;

		context.builder.version(1).sign("any pass");

		assert.equal(context.builder.getStruct().senderPublicKey, context.builder.data.senderPublicKey);
	});

	it("getStruct - when is signed it returns the amount", (context) => {
		context.builder.usernameAsset("homer");

		configManager.getMilestone().aip11 = false;

		context.builder.version(1).sign("any pass");

		assert.equal(context.builder.getStruct().amount, context.builder.data.amount);
	});

	it("getStruct - when is signed it returns the recipient id", (context) => {
		context.builder.usernameAsset("homer");

		configManager.getMilestone().aip11 = false;

		context.builder.version(1).sign("any pass");

		assert.equal(context.builder.getStruct().recipientId, context.builder.data.recipientId);
	});

	it("getStruct - when is signed it returns the asset", (context) => {
		context.builder.usernameAsset("homer");

		configManager.getMilestone().aip11 = false;

		context.builder.version(1).sign("any pass");

		assert.equal(context.builder.getStruct().asset, context.builder.data.asset);
	});
});
