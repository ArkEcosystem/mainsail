import { describe, Generators } from "@arkecosystem/core-test-framework";
import { BigNumber } from "../../../utils/bignum";
import { TransactionType } from "../../../enums";
import { configManager } from "../../../managers";
import { BuilderFactory } from "../../index";
import { Two } from "../../types";
import { NetworkConfig } from "../../../interfaces";
import { DelegateResignationBuilder } from "./delegate-resignation";

describe<{
	config: NetworkConfig;
	builder: DelegateResignationBuilder;
}>("Delegate Resignation Transaction", ({ it, assert, beforeAll, beforeEach, afterAll }) => {
	beforeAll((context) => {
		context.config = configManager.all();

		// todo: completely wrap this into a function to hide the generation and setting of the config?
		const config = Generators.generateCryptoConfigRaw();
		configManager.setConfig(config);
	});

	beforeEach((context) => {
		context.builder = BuilderFactory.delegateResignation();
	});

	afterAll((context) => {
		configManager.setConfig(context.config);
	});

	it("verify - should be valid with a signature", (context) => {
		const actual = context.builder.sign("dummy passphrase");

		assert.true(actual.build().verified);
		assert.true(actual.verify());
	});

	it("verify - should be valid with a second signature", (context) => {
		const actual = context.builder.sign("dummy passphrase");

		assert.true(actual.build().verified);
		assert.true(actual.verify());
	});

	it("properties - should have its specific properties", (context) => {
		assert.equal(context.builder.data.type, TransactionType.DelegateResignation);
		assert.equal(context.builder.data.amount, BigNumber.ZERO);
		assert.equal(context.builder.data.fee, Two.DelegateResignationTransaction.staticFee());
		assert.equal(context.builder.data.senderPublicKey, undefined);
	});

	it("properties - should not have the username yet", (context) => {
		assert.false(context.builder.data.hasOwnProperty("username"));
	});
});
