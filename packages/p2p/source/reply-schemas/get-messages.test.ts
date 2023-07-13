import { Validator } from "@mainsail/validation/source/validator";

import { schemas as cryptoBlockSchemas } from "../../../crypto-block/distribution";
import { schemas as cryptoValidationSchemas } from "../../../crypto-validation/distribution";
import { describe, Sandbox } from "../../../test-framework/distribution";
import { headers } from "../../test/fixtures/responses/headers";
import { getMessages } from "./get-messages";

type Context = {
	sandbox: Sandbox;
	validator: Validator;
};

describe<Context>("GetMessages Schema", ({ it, assert, beforeEach, each }) => {
	let data;

	beforeEach((context) => {
		data = {
			headers,
			precommits: [],
			prevotes: [],
		};

		context.sandbox = new Sandbox();

		context.validator = context.sandbox.app.resolve(Validator);

		context.validator.addSchema(cryptoValidationSchemas.hex);
		context.validator.addSchema(cryptoBlockSchemas.blockId);
	});

	it("should pass validation", ({ validator }) => {
		let result = validator.validate(getMessages, data);
		assert.undefined(result.error);

		result = validator.validate(getMessages, {
			...data,
			precommits: ["a"],
			prevotes: ["b"],
		});
		assert.undefined(result.error);
	});

	it("should not pass if precommits is not hex", ({ validator }) => {
		const result = validator.validate(getMessages, {
			...data,
			precommits: [1],
		});

		assert.defined(result.error);
	});

	it("should not pass if precommits.len > 51", ({ validator }) => {
		const result = validator.validate(getMessages, {
			...data,
			precommits: new Array(52).fill("a"),
		});

		assert.defined(result.error);
	});

	it("should not pass if prevotes is not hex", ({ validator }) => {
		const result = validator.validate(getMessages, {
			...data,
			prevotes: [1],
		});

		assert.defined(result.error);
	});

	it("should not pass if prevotes.len > 51", ({ validator }) => {
		const result = validator.validate(getMessages, {
			...data,
			prevotes: new Array(52).fill("a"),
		});

		assert.defined(result.error);
	});

	each(
		"should not pass if required property is not defined",
		({ context, dataset }) => {
			delete data[dataset];
			const result = context.validator.validate(getMessages, data);

			assert.defined(result.error);
		},
		["precommits", "prevotes", "headers"],
	);
});
