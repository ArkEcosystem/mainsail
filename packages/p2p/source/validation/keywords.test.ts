import { Validator } from "@mainsail/validation/source/validator";

import { describe, Sandbox } from "../../../test-framework";
import { makeKeywords } from "./keywords";

type Context = {
	validator: Validator;
	sandbox: Sandbox;
};

describe<{
	sandbox: Sandbox;
	validator: Validator;
}>("Keywords", ({ it, beforeEach, assert }) => {
	beforeEach((context) => {
		context.sandbox = new Sandbox();

		// context.sandbox.app.bind(Identifiers.Cryptography.Configuration).to(Configuration).inSingletonScope();
		// context.sandbox.app.get<Configuration>(Identifiers.Cryptography.Configuration).setConfig(cryptoJson);

		context.validator = context.sandbox.app.resolve(Validator);

		const keywords = makeKeywords();
		for (const keyword of Object.values(keywords)) {
			context.validator.addKeyword(keyword);
		}
	});

	it("keyword buffer should be ok", (context) => {
		const schema = {
			$id: "test",
			buffer: {},
		};
		context.validator.addSchema(schema);

		assert.undefined(context.validator.validate("test", Buffer.from("")).error);
		assert.undefined(context.validator.validate("test", Buffer.from("abc")).error);
		assert.undefined(context.validator.validate("test", Buffer.alloc(0)).error);
		assert.undefined(context.validator.validate("test", Buffer.alloc(10)).error);
	});

	it("keyword buffer should not be ok", (context) => {
		const schema = {
			$id: "test",
			buffer: {},
		};
		context.validator.addSchema(schema);

		assert.defined(context.validator.validate("test", 1).error);
		assert.defined(context.validator.validate("test", "abc").error);
		assert.defined(context.validator.validate("test").error);
		assert.defined(context.validator.validate("test", null).error);
		assert.defined(context.validator.validate("test", {}).error);
	});
});
