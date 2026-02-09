import { schemas as baseSchemas } from "@mainsail/crypto-validation";
import { Validator } from "@mainsail/validation/source/validator";

import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";
import { schemas } from "./schemas";

describe<{
	app: Application;
	validator: Validator;
}>("Schemas", ({ it, assert, beforeEach }) => {
	beforeEach((context) => {
		context.app = new Application();

		context.validator = context.app.resolve(Validator);

		for (const schema of Object.values({
			...baseSchemas,
			...schemas,
		})) {
			context.validator.addSchema(schema);
		}
	});

	it("consensusSignature - should be ok", async ({ validator }) => {
		const result = validator.validate("consensusSignature", "a".repeat(192));
		assert.undefined(result.error);
	});

	it("consensusSignature - should not be ok", async ({ validator }) => {
		const values = [
			"a".repeat(193), // too long
			"a".repeat(191), // too short
			"g".repeat(192), // not hex
			"0x" + "a".repeat(192), // not prefixed
			123, // not a string
			{}, // not a string
			[], // not a string
			undefined, // not a string
			null, // not a string
		];

		for (const value of values) {
			const result = validator.validate("consensusSignature", value);
			assert.defined(result.error);
		}
	});
});
