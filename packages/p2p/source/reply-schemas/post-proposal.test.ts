import { Validator } from "@mainsail/validation/source/validator";

import { describe, Sandbox } from "../../../test-framework";
import { headers } from "../../test/fixtures/responses/headers";
import { postProposal } from "./post-proposal";
import { prepareValidatorContext } from "../../test/helpers/prepare-validator-context";

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

		prepareValidatorContext(context);
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
