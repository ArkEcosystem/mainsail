import { Validator } from "@mainsail/validation/source/validator";

import { describe, Sandbox } from "../../../test-framework/source";
import { headers } from "../../test/fixtures/responses/headers";
import { prepareValidatorContext } from "../../test/helpers/prepare-validator-context";
import { postPrevote } from "./post-prevote";

type Context = {
	sandbox: Sandbox;
	validator: Validator;
};

describe<Context>("PostPrevote Schema", ({ it, assert, beforeEach, each }) => {
	const data = {
		headers,
	};

	beforeEach((context) => {
		context.sandbox = new Sandbox();

		context.validator = context.sandbox.app.resolve(Validator);

		prepareValidatorContext(context);
	});

	it("should pass validation", ({ validator }) => {
		const result = validator.validate(postPrevote, data);

		assert.undefined(result.error);
	});

	it("should not pass if headers are undefined", ({ validator }) => {
		const result = validator.validate(postPrevote, {});

		assert.defined(result.error);
	});
});
