import { Validator } from "@mainsail/validation/source/validator";

import { Application } from "@mainsail/kernel";
import { Container } from "@mainsail/container";
import { describe } from "@mainsail/test-runner";
import { headers } from "../../test/fixtures/responses/headers";
import { prepareValidatorContext } from "../../test/helpers/prepare-validator-context";
import { postProposal } from "./post-proposal";

type Context = {
	app: Application;
	validator: Validator;
};

describe<Context>("PostProposal Schema", ({ it, assert, beforeEach, each }) => {
	const data = {
		headers,
	};

	beforeEach((context) => {
		context.app = new Application(new Container());

		context.validator = context.app.resolve(Validator);

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
