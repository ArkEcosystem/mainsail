import { describe, Factories, Generators } from "@arkecosystem/core-test-framework";
import { BigNumber } from "../../../utils/bignum";
import { TransactionType } from "../../../enums";
import { Keys, WIF } from "../../../identities";
import { configManager } from "../../../managers";
import { devnet } from "../../../networks";
import { BuilderFactory } from "../../index";
import { TransferBuilder } from "./transfer";
import { Two } from "../../types";
import { NetworkConfig } from "../../../interfaces";

describe<{
	config: NetworkConfig;
	builder: TransferBuilder;
	identity: any;
}>("Transfer Transaction", ({ it, assert, beforeAll, afterAll, beforeEach }) => {
	beforeAll((context) => {
		context.config = configManager.all();

		// todo: completely wrap this into a function to hide the generation and setting of the config?
		const config = Generators.generateCryptoConfigRaw();
		configManager.setConfig(config);

		context.identity = Factories.factory("Identity")
			.withOptions({ passphrase: "this is a top secret passphrase", network: config.network })
			.make();
	});

	beforeEach((context) => {
		context.builder = BuilderFactory.transfer();
	});

	afterAll((context) => {
		configManager.setConfig(context.config);
	});

	it("verify - should be valid with a signature", (context) => {
		const actual = context.builder
			.recipientId(context.identity.address)
			.amount("1")
			.vendorField("dummy")
			.sign("dummy passphrase");

		assert.true(actual.build().verified);
		assert.true(actual.verify());
	});

	it("verify - should be valid with a second signature", (context) => {
		const actual = context.builder
			.recipientId(context.identity.address)
			.amount("1")
			.vendorField("dummy")
			.sign("dummy passphrase");

		assert.true(actual.build().verified);
		assert.true(actual.verify());
	});

	it("signWithWif - should sign a transaction and match signed with a passphrase", (context) => {
		const passphrase = "sample passphrase";
		const network = 23;
		const keys = Keys.fromPassphrase(passphrase);
		const wif = WIF.fromKeys(keys, devnet.network);

		const wifTransaction = context.builder
			.recipientId(context.identity.address)
			.amount("10")
			.fee("10")
			.network(network);

		const passphraseTransaction = BuilderFactory.transfer();
		passphraseTransaction.data = { ...wifTransaction.data };

		wifTransaction.signWithWif(wif, 170);
		passphraseTransaction.sign(passphrase);

		assert.equal(wifTransaction.data.signature, passphraseTransaction.data.signature);
	});

	it("should have its specific properties", (context) => {
		assert.equal(context.builder.data.type, TransactionType.Transfer);
		assert.equal(context.builder.data.fee, Two.TransferTransaction.staticFee());
		assert.equal(context.builder.data.amount, BigNumber.make(0));
		assert.equal(context.builder.data.recipientId, undefined);
		assert.equal(context.builder.data.senderPublicKey, undefined);
		assert.equal(context.builder.data.expiration, 0);
	});

	it("vendorField - should set the vendorField", (context) => {
		context.builder.vendorField("fake");

		assert.equal(context.builder.data.vendorField, "fake");
	});
});
