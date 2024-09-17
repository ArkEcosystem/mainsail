import { Contracts, Identifiers } from "@mainsail/contracts";
import { Configuration } from "@mainsail/crypto-config";
import { Validator } from "@mainsail/validation/source/validator";

import cryptoJson from "../../../core/bin/config/testnet/core/crypto.json";
import { describe, Sandbox } from "../../../test-framework/source";
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
		context.validator.addKeyword(keywords.transactionGasLimit);
		context.validator.addKeyword(keywords.bytecode);
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

	it("keyword network - should not be ok if value is false ", (context) => {
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

	it("keyword transactionGasLimit should be ok", (context) => {
		const schema = {
			$id: "test",
			transactionGasLimit: {},
		};
		context.validator.addSchema(schema);

		assert.undefined(context.validator.validate("test", cryptoJson.milestones[0].gas!.minimumGasLimit).error);
		assert.undefined(context.validator.validate("test", cryptoJson.milestones[0].gas!.maximumGasLimit).error);

		assert.defined(context.validator.validate("test", 1).error);
		assert.defined(context.validator.validate("test", 0).error);
		assert.defined(context.validator.validate("test", -1).error);
		assert.defined(context.validator.validate("test", Number.MAX_SAFE_INTEGER).error);
		assert.defined(context.validator.validate("test", "asdf").error);
	});

	it("keyword bytecode should be ok", (context) => {
		const schema = {
			$id: "test",
			bytecode: {},
		};
		context.validator.addSchema(schema);

		assert.undefined(context.validator.validate("test", "").error);
		assert.undefined(context.validator.validate("test", "0x00").error);
		assert.undefined(context.validator.validate("test", "0x").error);
		assert.undefined(context.validator.validate("test", "00").error);

		const maxBytecodeLength = cryptoJson.milestones[0].gas!.maximumGasLimit / 2;
		const maxPayload = "0x" + "a".repeat(maxBytecodeLength);
		assert.undefined(context.validator.validate("test", maxPayload).error);

		assert.defined(context.validator.validate("test", maxPayload + "aa").error);

		assert.defined(context.validator.validate("test", 1).error);
		assert.defined(context.validator.validate("test", 0).error);
		assert.defined(context.validator.validate("test", -1).error);
		assert.defined(context.validator.validate("test", Number.MAX_SAFE_INTEGER).error);
		assert.defined(context.validator.validate("test", "asdf").error);
	});

	it("keyword bytecode should remove 0x prefix", (context) => {
		const schema = {
			$id: "test",
			type: "object",
			properties: {
				payload: { bytecode: {} },
			},
		};

		context.validator.addSchema(schema);

		const withPrefix = {
			payload: "0xdead",
		};

		assert.undefined(context.validator.validate("test", withPrefix).error);
		assert.equal(withPrefix.payload, "dead");

		const withoutPrefix = {
			payload: "dead",
		};

		assert.undefined(context.validator.validate("test", withoutPrefix).error);
		assert.equal(withoutPrefix.payload, "dead");
	});
});
