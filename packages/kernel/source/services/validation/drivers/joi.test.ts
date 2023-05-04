import Joi from "joi";

import { describe } from "../../../../../core-test-framework";
import { JoiValidator } from "./joi";

const schema = Joi.object({
	username: Joi.string().alphanum().required(),
});

describe<{
	validator: JoiValidator;
}>("JoiValidator", ({ assert, beforeEach, it }) => {
	beforeEach((context) => {
		context.validator = new JoiValidator();
	});

	it("should pass to validate the given data", (context) => {
		context.validator.validate({ username: "johndoe" }, schema);

		assert.true(context.validator.passes());
		assert.equal(context.validator.invalid(), {});
		assert.equal(context.validator.failed(), {});
		assert.equal(context.validator.errors(), {});
	});

	it("should fail to validate the given data", (context) => {
		context.validator.validate({ username: "l337_p@nda" }, schema);

		assert.true(context.validator.fails());
	});

	it("should return the failed rules", (context) => {
		context.validator.validate({ username: "l337_p@nda" }, schema);

		assert.equal(context.validator.failed(), { username: ["string.alphanum"] });
	});

	it("should return the error messages", (context) => {
		context.validator.validate({ username: "l337_p@nda" }, schema);

		assert.equal(context.validator.errors(), {
			username: ['"username" must only contain alpha-numeric characters'],
		});
	});

	it("should return the valid attributes", (context) => {
		context.validator.validate({ username: "johndoe" }, schema);

		assert.equal(context.validator.valid(), { username: "johndoe" });
	});

	it("should return the invalid attributes", (context) => {
		context.validator.validate({ username: "l337_p@nda" }, schema);

		assert.equal(context.validator.invalid(), { username: "l337_p@nda" });
	});

	it("should return the original attributes", (context) => {
		context.validator.validate({ username: "l337_p@nda" }, schema);

		assert.equal(context.validator.attributes(), { username: "l337_p@nda" });
	});
});
