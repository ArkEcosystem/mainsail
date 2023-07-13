import { Validator } from "@mainsail/validation/source/validator";

import { schemas as cryptoBlockSchemas } from "../../../crypto-block";
import { schemas as cryptoValidationSchemas } from "../../../crypto-validation";
import { describe, Sandbox } from "../../../test-framework";
import { headers } from "../../test/fixtures/responses/headers";
import { postProposal } from "./post-proposal";

type Context = {
	sandbox: Sandbox;
	validator: Validator;
};

describe<Context>("PostProposal Schema", ({ it, assert, beforeEach, each }) => {
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
		const result = validator.validate(postProposal, data);

		assert.undefined(result.error);
	});

	it("should not pass if headers are undefined", ({ validator }) => {
		const result = validator.validate(postProposal, {});

		assert.defined(result.error);
	});
});
