import { Validator } from "@mainsail/validation/source/validator";

import { schemas as cryptoBlockSchemas } from "../../../crypto-block";
import { schemas as cryptoValidationSchemas } from "../../../crypto-validation";
import { describe, Sandbox } from "../../../test-framework";
import { headers } from "../../test/fixtures/responses/headers";
import { postPrecommit } from "./post-precommit";

type Context = {
	sandbox: Sandbox;
	validator: Validator;
};

describe<Context>("PostPrecommit Schema", ({ it, assert, beforeEach, each }) => {
	const data = {
		headers,
	};

	beforeEach((context) => {
		context.sandbox = new Sandbox();

		context.validator = context.sandbox.app.resolve(Validator);

		context.validator.addSchema(cryptoValidationSchemas.hex);
		context.validator.addSchema(cryptoBlockSchemas.blockId);
	});

	it("should pass validation", ({ validator }) => {
		const result = validator.validate(postPrecommit, data);

		assert.undefined(result.error);
	});

	it("should not pass if headers are undefined", ({ validator }) => {
		const result = validator.validate(postPrecommit, {});

		assert.defined(result.error);
	});
});
