import { Validator } from "@mainsail/validation/source/validator";

import { describe, Sandbox } from "@mainsail/test-framework/source";
import { headers } from "../../test/fixtures/responses/headers";
import { prepareValidatorContext } from "../../test/helpers/prepare-validator-context";
import { postMessage } from "./post-message.js";

type Context = {
	sandbox: Sandbox;
	validator: Validator;
};

describe<Context>("PostMessage Schema", ({ it, assert, beforeEach, each }) => {
	const data = {
		headers,
	};

	beforeEach((context) => {
		context.sandbox = new Sandbox();

		context.validator = context.sandbox.app.resolve(Validator);

		prepareValidatorContext(context);
	});

	it("should pass validation", ({ validator }) => {
		const result = validator.validate(postMessage, data);

		assert.undefined(result.error);
	});

	it("should not pass if headers are undefined", ({ validator }) => {
		const result = validator.validate(postMessage, {});

		assert.defined(result.error);
	});
});
