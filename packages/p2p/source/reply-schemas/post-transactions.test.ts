import { Validator } from "@mainsail/validation/source/validator";

import { describe, Sandbox } from "../../../test-framework/source";
import { headers } from "../../test/fixtures/responses/headers";
import { prepareValidatorContext } from "../../test/helpers/prepare-validator-context";
import { postTransactions } from "./post-transactions";

type Context = {
	sandbox: Sandbox;
	validator: Validator;
};

describe<Context>("PostTransactions Schema", ({ it, assert, beforeEach, each }) => {
	let data;

	beforeEach((context) => {
		data = {
			accept: ["1"],
			headers,
		};

		context.sandbox = new Sandbox();

		context.validator = context.sandbox.app.resolve(Validator);

		prepareValidatorContext(context);
	});

	it("should pass validation", ({ validator }) => {
		const result = validator.validate(postTransactions, data);

		assert.undefined(result.error);
	});

	it("should not pass if asset is not transactionId", ({ validator }) => {
		const result = validator.validate(postTransactions, { ...data, accept: ["a"] });

		assert.defined(result.error);
	});

	each(
		"should not pass if required property is not defined",
		({ context, dataset }) => {
			delete data[dataset];
			const result = context.validator.validate(postTransactions, data);

			assert.defined(result.error);
		},
		["accept", "headers"],
	);
});
