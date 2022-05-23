import { Identifiers } from "@arkecosystem/core-contracts";
import { Configuration } from "@arkecosystem/core-crypto-config";
import { Validator } from "@arkecosystem/core-validation/source/validator";

import cryptoJson from "../../core/bin/config/testnet/crypto.json";
import { describe, Sandbox } from "../../core-test-framework";
import { makeKeywords } from "./keywords";
import { schemas } from "./schemas";

describe<{
	sandbox: Sandbox;
	validator: Validator;
}>("Schemas", ({ it, assert, beforeEach }) => {
	beforeEach((context) => {
		context.sandbox = new Sandbox();

		context.sandbox.app.bind(Identifiers.Cryptography.Configuration).to(Configuration).inSingletonScope();
		context.sandbox.app.get<Configuration>(Identifiers.Cryptography.Configuration).setConfig(cryptoJson);

		context.validator = context.sandbox.app.resolve(Validator);

		const keywords = makeKeywords(context.sandbox.app.get<Configuration>(Identifiers.Cryptography.Configuration));
		for (const keyword of Object.values(keywords)) {
			context.validator.addKeyword(keyword);
		}

		for (const schema of Object.values(schemas)) {
			context.validator.addSchema(schema);
		}
	});

	it("alphanumeric - should be ok", ({ validator }) => {
		const validChars = "0123456789abcdefghijklmnopqrstuvwxyz";

		for (const char of validChars) {
			assert.undefined(validator.validate("alphanumeric", char).error);
			assert.undefined(validator.validate("alphanumeric", char.repeat(20)).error);
		}
	});

	it("alphanumeric - should not be ok", ({ validator }) => {
		const invalidChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

		for (const char of invalidChars) {
			assert.defined(validator.validate("alphanumeric", char).error);
			assert.defined(validator.validate("alphanumeric", char.repeat(20)).error);
		}

		assert.defined(validator.validate("address", 123).error);
		assert.defined(validator.validate("address", null).error);
		assert.defined(validator.validate("address").error);
		assert.defined(validator.validate("address", {}).error);
	});

	it("hex - should be ok", ({ validator }) => {
		const validChars = "0123456789abcdef";

		for (const char of validChars) {
			assert.undefined(validator.validate("hex", char).error);
			assert.undefined(validator.validate("hex", char.repeat(20)).error);
		}
	});

	it("hex - should not be ok", ({ validator }) => {
		assert.defined(validator.validate("hex", 123).error);
		assert.defined(validator.validate("hex", null).error);
		assert.defined(validator.validate("hex").error);
		assert.defined(validator.validate("hex", {}).error);

		const invalidChars = "ABCDEFGHIJKLghijkl!#$%&'|+/";

		for (const char of invalidChars) {
			assert.defined(validator.validate("hex", char).error);
			assert.defined(validator.validate("hex", char.repeat(20)).error);
		}
	});
});
