import { Identifiers } from "@mainsail/constants";
import { ServiceProvider as ValidationServiceProvider } from "@mainsail/validation";
import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";
import { Contracts } from "@mainsail/contracts";
import { schemas } from "./schemas.js";

describe<{
	app: Application;
	validator: Contracts.Crypto.Validator;
}>("blockTag schema", ({ beforeEach, it, assert }) => {
	beforeEach(async (context) => {
		context.app = new Application();
		await context.app.resolve(ValidationServiceProvider).register();

		context.validator = context.app.get<Contracts.Crypto.Validator>(Identifiers.Cryptography.Validator);
		context.validator.addSchema(schemas.blockTag);
	});

	it("should accept the supported named tags", ({ validator }) => {
		for (const tag of ["latest", "safe", "finalized"]) {
			assert.undefined(validator.validate("blockTag", tag).errors);
		}
	});

	it("should accept 0x-prefixed quantities", ({ validator }) => {
		for (const tag of ["0x0", "0x1", "0xff", "0xabcdef123"]) {
			assert.undefined(validator.validate("blockTag", tag).errors);
		}
	});

	it("should reject the unsupported 'pending' and 'earliest' tags", ({ validator }) => {
		for (const tag of ["pending", "earliest"]) {
			assert.defined(validator.validate("blockTag", tag).errors);
		}
	});

	it("should reject malformed or non-string values", ({ validator }) => {
		for (const value of ["LATEST", "0x", "0X1", "0xABC", "1", "", 1, null, {}]) {
			assert.defined(validator.validate("blockTag", value).errors);
		}
	});
});
