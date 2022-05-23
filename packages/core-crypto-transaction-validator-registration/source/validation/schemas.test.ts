import { Identifiers } from "@arkecosystem/core-contracts";
import { Configuration } from "@arkecosystem/core-crypto-config";
import { makeKeywords } from "@arkecosystem/core-crypto-validation";
import { Validator } from "@arkecosystem/core-validation/source/validator";

import cryptoJson from "../../../core/bin/config/testnet/crypto.json";
import { describe, Sandbox } from "../../../core-test-framework";
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

		for (const keyword of Object.values(
			makeKeywords(context.sandbox.app.get<Configuration>(Identifiers.Cryptography.Configuration)),
		)) {
			context.validator.addKeyword(keyword);
		}

		for (const schema of Object.values(schemas)) {
			context.validator.addSchema(schema);
		}
	});

	it("validatorUsername - should be ok", ({ validator }) => {
		assert.undefined(validator.validate("validatorUsername", "0".repeat(1)).error);
		assert.undefined(validator.validate("validatorUsername", "0".repeat(20)).error);

		const validChars = "0123456789abcdefghijklmnopqrstuvwxyz!@$&_.";

		for (const char of validChars) {
			assert.undefined(validator.validate("validatorUsername", char.repeat(20)).error);
		}
	});

	it("validatorUsername - should not be ok", ({ validator }) => {
		assert.defined(validator.validate("validatorUsername", "0".repeat(21)).error);
		assert.defined(validator.validate("transactionId", 123).error);
		assert.defined(validator.validate("transactionId", null).error);
		assert.defined(validator.validate("transactionId").error);
		assert.defined(validator.validate("transactionId", {}).error);

		const invalidChars = "ABCDEFGHJKLMNPQRSTUVWXYZ+-?";

		for (const char of invalidChars) {
			assert.defined(validator.validate("validatorUsername", char.repeat(20)).error);
		}
	});
});
