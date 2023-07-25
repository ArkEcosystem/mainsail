import { Validator } from "@mainsail/validation/source/validator";
import { describe, Sandbox } from "../../../test-framework/distribution";
import { headers } from "../../test/fixtures/responses/headers";
import { getBlocks } from "./get-blocks";
import { prepareValidatorContext } from "../../test/helpers/prepare-validator-context";

type Context = {
	sandbox: Sandbox;
	validator: Validator;
};

describe<Context>("GetBlocks Schema", ({ it, assert, beforeEach, each }) => {
	let data;

	beforeEach((context) => {
		data = {
			blocks: [Buffer.from("a")],
			headers,
		};

		context.sandbox = new Sandbox();

		context.validator = context.sandbox.app.resolve(Validator);

		prepareValidatorContext(context);
	});

	it("should pass validation", ({ validator }) => {
		const result = validator.validate(getBlocks, data);

		assert.undefined(result.error);
	});

	it("should not pass if blocks is not buffer", ({ validator }) => {
		const result = validator.validate(getBlocks, { ...data, blocks: [1] });

		assert.defined(result.error);
	});

	each(
		"should not pass if required property is not defined",
		({ context, dataset }) => {
			delete data[dataset];
			const result = context.validator.validate(getBlocks, data);

			assert.defined(result.error);
		},
		["blocks", "headers"],
	);
});
