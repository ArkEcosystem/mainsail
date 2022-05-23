import { Contracts, Identifiers } from "@arkecosystem/core-contracts";
import { Configuration } from "@arkecosystem/core-crypto-config";
import { Validator } from "@arkecosystem/core-validation/source/validator";

import cryptoJson from "../../../core/bin/config/testnet/crypto.json";
import { describe, Sandbox } from "../../../core-test-framework";
import { makeKeywords } from "./keywords";

describe<{
	sandbox: Sandbox;
	validator: Validator;
}>("Keywords", ({ it, beforeEach, assert }) => {
	beforeEach((context) => {
		context.sandbox = new Sandbox();

		context.validator = context.sandbox.app.resolve(Validator);

		context.sandbox.app.bind(Identifiers.Cryptography.Configuration).to(Configuration).inSingletonScope();
		context.sandbox.app.get<Configuration>(Identifiers.Cryptography.Configuration).setConfig(cryptoJson);

		const keywords = makeKeywords(context.sandbox.app.get<Configuration>(Identifiers.Cryptography.Configuration));
		context.validator.addKeyword(keywords.transactionType);
		context.validator.addKeyword(keywords.network);
	});

	it("keyword transactionType should be ok", (context) => {
		const schema = {
			$id: "test",
			transactionType: Contracts.Crypto.TransactionType.Transfer,
		};
		context.validator.addSchema(schema);

		assert.undefined(context.validator.validate("test", Contracts.Crypto.TransactionType.Transfer).error);

		assert.defined(context.validator.validate("test", Contracts.Crypto.TransactionType.Vote).error);
		assert.defined(context.validator.validate("test", -1).error);
		assert.defined(context.validator.validate("test", "").error);
		assert.defined(context.validator.validate("test", "0").error);
		assert.defined(context.validator.validate("test", null).error);
		assert.defined(context.validator.validate("test").error);
	});

	it("keyword network should be ok", (context) => {
		const schema = {
			$id: "test",
			network: true,
		};
		context.validator.addSchema(schema);

		assert.undefined(context.validator.validate("test", 30).error);

		assert.defined(context.validator.validate("test", 23).error);
		assert.defined(context.validator.validate("test", "a").error);
	});

	it.only("keyword network - should not be ok if value is false ", (context) => {
		const schema = {
			$id: "test",
			network: false,
		};
		context.validator.addSchema(schema);

		assert.defined(context.validator.validate("test", 30).error);
		assert.defined(context.validator.validate("test", 23).error);
		assert.defined(context.validator.validate("test", "a").error);
	});

	it("keyword network - should return true when network is not set in configuration", (context) => {
		context.sandbox.app.get<Configuration>(Identifiers.Cryptography.Configuration).set("network", {});

		const schema = {
			$id: "test",
			network: true,
		};
		context.validator.addSchema(schema);

		assert.undefined(context.validator.validate("test", 30).error);
		assert.undefined(context.validator.validate("test", 23).error);
		assert.undefined(context.validator.validate("test", "a").error);
	});
});
