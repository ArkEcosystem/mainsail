import { Identifiers } from "@mainsail/contracts";
import { Configuration } from "@mainsail/crypto-config";
import { makeKeywords } from "@mainsail/crypto-validation";
import { Validator } from "@mainsail/validation/source/validator";

import cryptoJson from "../../../core/bin/config/testnet/mainsail/crypto.json";
import { describe, Sandbox } from "../../../test-framework";
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

	it("username - should be ok", ({ validator }) => {
		assert.undefined(validator.validate("username", "0".repeat(1)).error);
		assert.undefined(validator.validate("username", "0".repeat(20)).error);
		assert.undefined(validator.validate("username", "a_a").error);

		const validChars = "0123456789abcdefghijklmnopqrstuvwxyz";

		for (const char of validChars) {
			assert.undefined(validator.validate("username", char.repeat(20)).error);
		}
	});

	it("username - should not be ok", ({ validator }) => {
		assert.defined(validator.validate("username", "0".repeat(21)).error);
		assert.defined(validator.validate("username", "").error);
		assert.defined(validator.validate("username", 123).error);
		assert.defined(validator.validate("username", null).error);
		assert.defined(validator.validate("username").error);
		assert.defined(validator.validate("username", {}).error);

		assert.defined(validator.validate("username", "_a").error);
		assert.defined(validator.validate("username", "a_").error);
		assert.defined(validator.validate("username", "a__a").error);

		const invalidChars = "ABCDEFGHJKLMNPQRSTUVWXYZ+-?!@$&.";

		for (const char of invalidChars) {
			assert.defined(validator.validate("username", char.repeat(20)).error);
		}
	});
});
