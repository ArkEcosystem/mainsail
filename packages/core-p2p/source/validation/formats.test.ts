import { Validator } from "@arkecosystem/core-validation/source/validator";

import { describe, Sandbox } from "../../../core-test-framework";
import { makeFormats } from "./formats";

describe<{
	validator: Validator;
	sandbox: Sandbox;
}>("format vendorField", ({ it, assert, beforeEach }) => {
	beforeEach((context) => {
		context.sandbox = new Sandbox();
		context.validator = context.sandbox.app.resolve(Validator);

		const formats = makeFormats();

		context.validator.addFormat("validPeer", formats.validPeer);
	});

	it("#peer - should be ok", (context) => {
		const schema = {
			$id: "test",
			format: "validPeer",
			type: "string",
		};
		context.validator.addSchema(schema);

		assert.undefined(context.validator.validate("test", "192.168.178.0").error);
		assert.undefined(context.validator.validate("test", "5.196.105.32").error);
	});

	it("#peer - should not be ok", (context) => {
		const schema = {
			$id: "test",
			format: "validPeer",
			type: "string",
		};
		context.validator.addSchema(schema);

		assert.defined(context.validator.validate("test", "aaaa").error);
		assert.defined(context.validator.validate("test", "127.0.0.1").error);
		assert.defined(context.validator.validate("test", null).error);
		assert.defined(context.validator.validate("test", {}).error);
		assert.defined(context.validator.validate("test").error);
	});
});
