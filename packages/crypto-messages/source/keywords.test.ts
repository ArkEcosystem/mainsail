import { Contracts, Identifiers } from "@mainsail/contracts";
import { Configuration } from "@mainsail/crypto-config";
import { Validator } from "@mainsail/validation/source/validator";

import cryptoJson from "../../core/bin/config/testnet/crypto.json";
import { describe, Sandbox } from "../../test-framework";
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
		context.validator.addKeyword(keywords.isValidatorBitmap);
		context.validator.addKeyword(keywords.isValidatorIndex);
	});

	it("keyword isValidatorBitmap - should be ok", (context) => {
		const schema = {
			$id: "test",
			isValidatorBitmap: {},
		};
		context.validator.addSchema(schema);

		const { activeValidators } = context.sandbox.app.get<Contracts.Crypto.IConfiguration>(Identifiers.Cryptography.Configuration).getMilestone();

		let matrix = new Array(activeValidators).fill(true)
		assert.undefined(context.validator.validate("test", matrix).error);

		matrix = new Array(activeValidators).fill(false)
		assert.undefined(context.validator.validate("test", matrix).error);

		matrix = new Array(activeValidators).fill(1)
		assert.defined(context.validator.validate("test", matrix).error);

		matrix = new Array(activeValidators - 1).fill(false)
		assert.defined(context.validator.validate("test", matrix).error);

		assert.defined(context.validator.validate("test", {}).error);
		assert.defined(context.validator.validate("test", undefined).error);
		assert.defined(context.validator.validate("test", null).error);
		assert.defined(context.validator.validate("test", "12134354").error);
		assert.defined(context.validator.validate("test", []).error);
		assert.defined(context.validator.validate("test", 1).error);
	});

	it("keyword isValidatorBitmap - should be ok with minimum", (context) => {
		const schema = {
			$id: "test",
			isValidatorBitmap: {
				minimum: 0,
			},
		};
		context.validator.addSchema(schema);

		const { activeValidators } = context.sandbox.app.get<Contracts.Crypto.IConfiguration>(Identifiers.Cryptography.Configuration).getMilestone();

		let matrix = new Array(activeValidators).fill(true)
		assert.undefined(context.validator.validate("test", matrix).error);

		matrix = new Array(activeValidators + 1).fill(true)
		assert.defined(context.validator.validate("test", matrix).error);

		assert.undefined(context.validator.validate("test", []).error);
		assert.undefined(context.validator.validate("test", [false]).error);
		assert.undefined(context.validator.validate("test", [true]).error);
	});

	it("keyword isValidatorIndex - should be ok", (context) => {
		const schema = {
			$id: "test",
			isValidatorIndex: {},
		};
		context.validator.addSchema(schema);

		const { activeValidators } = context.sandbox.app.get<Contracts.Crypto.IConfiguration>(Identifiers.Cryptography.Configuration).getMilestone();

		for (let i = 0; i < activeValidators; i++) {
			assert.undefined(context.validator.validate("test", i).error);
		}

		assert.defined(context.validator.validate("test", 50.00001).error);
		assert.defined(context.validator.validate("test", activeValidators).error);
		assert.defined(context.validator.validate("test", activeValidators + 1).error);
		assert.defined(context.validator.validate("test", "a").error);
		assert.defined(context.validator.validate("test", undefined).error);
	});
});
