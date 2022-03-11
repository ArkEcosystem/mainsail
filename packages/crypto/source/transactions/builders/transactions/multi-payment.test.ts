import { describe, Generators } from "@arkecosystem/core-test-framework";
import { BigNumber } from "../../../utils/bignum";
import { TransactionType } from "../../../enums";
import { configManager } from "../../../managers";
import { BuilderFactory } from "../../index";
import { Two } from "../../types";
import { NetworkConfig } from "../../../interfaces";
import { MaximumPaymentCountExceededError } from "../../../errors";
import { MultiPaymentBuilder } from "./multi-payment";

describe<{
	config: NetworkConfig;
	builder: MultiPaymentBuilder;
}>("Multi Payment Transaction", ({ it, assert, beforeAll, beforeEach, afterAll }) => {
	beforeAll((context) => {
		context.config = configManager.all();

		// todo: completely wrap this into a function to hide the generation and setting of the config?
		const config = Generators.generateCryptoConfigRaw();
		configManager.setConfig(config);
	});

	beforeEach((context) => {
		context.builder = BuilderFactory.multiPayment();
	});

	afterAll((context) => {
		configManager.setConfig(context.config);
	});

	it("should have its specific properties", (context) => {
		assert.equal(context.builder.data.type, TransactionType.MultiPayment);
		assert.equal(context.builder.data.fee, Two.MultiPaymentTransaction.staticFee());
		assert.equal(context.builder.data.asset.payments, []);
		assert.equal(context.builder.data.vendorField, undefined);
	});

	it("vendorField - should set the vendorField", (context) => {
		const data = "dummy";
		context.builder.vendorField(data);

		assert.equal(context.builder.data.vendorField, data);
	});

	it("addPayment - should add new payments", (context) => {
		context.builder.addPayment("address", "1");
		context.builder.addPayment("address", "2");
		context.builder.addPayment("address", "3");

		assert.equal(context.builder.data.asset.payments, [
			{
				amount: BigNumber.ONE,
				recipientId: "address",
			},
			{
				amount: BigNumber.make(2),
				recipientId: "address",
			},
			{
				amount: BigNumber.make(3),
				recipientId: "address",
			},
		]);
	});

	it("addPayment - should throw if we want to add more payments than max authorized", (context) => {
		context.builder.data.asset.payments = new Array(500);

		assert.throws(
			() => context.builder.addPayment("address", "2"),
			(err) => err instanceof MaximumPaymentCountExceededError,
		);
	});
});
