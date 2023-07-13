import { Validator } from "@mainsail/validation/source/validator";

import { schemas as cryptoBlockSchemas } from "../../../crypto-block/distribution";
import { schemas as cryptoTransactionSchemas } from "../../../crypto-transaction/distribution";
import { schemas as cryptoValidationSchemas } from "../../../crypto-validation/distribution";
import { describe, Sandbox } from "../../../test-framework/distribution";
import { headers } from "../../test/fixtures/responses/headers";
import { postTransactions } from "./post-transactions";

type Context = {
	sandbox: Sandbox;
	validator: Validator;
};

describe<Context>("PostTransactions Schema", ({ it, assert, beforeEach, each }) => {
	let data;

	beforeEach((context) => {
		data = {
			accept: ["a".repeat(64)],
			headers,
		};

		context.sandbox = new Sandbox();

		context.validator = context.sandbox.app.resolve(Validator);

		context.validator.addSchema(cryptoValidationSchemas.hex);
		context.validator.addSchema(cryptoBlockSchemas.blockId);
		context.validator.addSchema(cryptoTransactionSchemas.transactionId);
	});

	it("should pass validation", ({ validator }) => {
		const result = validator.validate(postTransactions, data);

		console.log(result.error);
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
