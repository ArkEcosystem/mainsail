import { Validator } from "@mainsail/validation/source/validator";

import { schemas as cryptoBlockSchemas } from "../../../crypto-block";
import { schemas as cryptoValidationSchemas } from "../../../crypto-validation";
import { describe, Sandbox } from "../../../test-framework";
import { postPrecommit } from "./post-precommit";

type Context = {
	sandbox: Sandbox;
	validator: Validator;
};

describe<Context>("Schemas", ({ it, assert, beforeEach, each }) => {
	const headers = {
		height: 1,
		proposedBlockId: "a".repeat(64),
		round: 0,
		step: 0,
		validatorsSignedPrecommit: [true],
		validatorsSignedPrevote: [true],
		version: "2.0.0",
	};

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
});
