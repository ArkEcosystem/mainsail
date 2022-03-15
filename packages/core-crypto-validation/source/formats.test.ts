import { describe } from "@arkecosystem/core-test-framework";
import Ajv from "ajv";

import { Managers, Validation } from "../";

describe<{
	ajv: Ajv;
}>("format vendorField", ({ it, assert, beforeAll }) => {
	beforeAll((context) => {
		context.ajv = Validation.validator.getInstance();
	});

	it("should be ok with 64 bytes", (context) => {
		const schema = { type: "string", format: "vendorField" };
		const validate = context.ajv.compile(schema);

		assert.true(validate("1234"));
		assert.true(validate("a".repeat(64)));
		assert.false(validate("a".repeat(65)));
		assert.true(validate("⊁".repeat(21)));
		assert.false(validate("⊁".repeat(22)));
		assert.false(validate({}));
		assert.false(validate(null));
		assert.false(validate(undefined));
	});

	it("should not be ok with over 64 bytes without milestone ", (context) => {
		const schema = { type: "string", format: "vendorField" };
		const validate = context.ajv.compile(schema);
		assert.false(validate("a".repeat(65)));
	});

	it("should be ok with up to 255 bytes with milestone ", (context) => {
		Managers.configManager.getMilestone().vendorFieldLength = 255;
		const schema = { type: "string", format: "vendorField" };
		const validate = context.ajv.compile(schema);
		assert.true(validate("a".repeat(65)));
		assert.true(validate("⊁".repeat(85)));
		assert.false(validate("a".repeat(256)));
		assert.false(validate("⊁".repeat(86)));

		Managers.configManager.getMilestone().vendorFieldLength = 64;
	});
});
