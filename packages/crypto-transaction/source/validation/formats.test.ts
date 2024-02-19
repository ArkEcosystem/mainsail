import { Identifiers } from "@mainsail/contracts";
import { Configuration } from "@mainsail/crypto-config";
import { Validator } from "@mainsail/validation/source/validator";

import cryptoJson from "../../../core/bin/config/testnet/core/crypto.json";
import { describe, Sandbox } from "../../../test-framework";
import { makeFormats } from "./formats";

type Context = {
	validator: Validator;
	sandbox: Sandbox;
};

describe<Context>("format vendorField", ({ it, assert, beforeEach }) => {
	beforeEach((context) => {
		context.sandbox = new Sandbox();

		context.sandbox.app.bind(Identifiers.Cryptography.Configuration).to(Configuration).inSingletonScope();
		context.sandbox.app.get<Configuration>(Identifiers.Cryptography.Configuration).setConfig(cryptoJson);

		context.validator = context.sandbox.app.resolve(Validator);

		const formats = makeFormats(context.sandbox.app.get<Configuration>(Identifiers.Cryptography.Configuration));

		context.validator.addFormat("vendorField", formats.vendorField);
	});

	it("#vendorField - should be ok", (context) => {
		const schema = {
			$id: "test",
			format: "vendorField",
			type: "string",
		};
		context.validator.addSchema(schema);

		assert.undefined(context.validator.validate("test", "false").error);
		assert.undefined(context.validator.validate("test", "a".repeat(255)).error);
		assert.undefined(context.validator.validate("test", "⊁".repeat(85)).error);
	});

	it("#vendorField - should not be ok", (context) => {
		const schema = {
			$id: "test",
			format: "vendorField",
			type: "string",
		};
		context.validator.addSchema(schema);

		assert.defined(context.validator.validate("test", "a".repeat(256)).error);
		assert.defined(context.validator.validate("test", "⊁".repeat(86)).error);
		assert.defined(context.validator.validate("test", {}).error);
		assert.defined(context.validator.validate("test", null).error);
		assert.defined(context.validator.validate("test").error);
	});
});
