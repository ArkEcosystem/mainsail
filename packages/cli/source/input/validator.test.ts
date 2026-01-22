import Joi from "joi";

import { describe } from "@mainsail/test-runner";
import { InputValidator } from "./validator";
import { Console } from "../test/index.js";

describe<{
	validator: InputValidator;
}>("InputValidator", ({ it, beforeEach, assert }) => {
	beforeEach((context) => {
		const cli = new Console();
		context.validator = cli.app.resolve(InputValidator);
	});

	it("should validate the data and return it", ({ validator }) => {
		assert.equal(
			validator.validate(
				{ firstName: "john", lastName: "doe" },
				{
					firstName: Joi.string(),
					lastName: Joi.string(),
				},
			),
			{ firstName: "john", lastName: "doe" },
		);
	});

	it("should throw if the data is valid", ({ validator }) => {
		assert.throws(
			() =>
				validator.validate(
					{ firstName: "john", lastName: "doe" },
					{
						firstName: Joi.string(),
						lastName: Joi.number(),
					},
				),
			'"lastName" must be a number',
		);
	});
});
