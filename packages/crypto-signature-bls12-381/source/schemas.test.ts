import { ServiceProvider as ValidationServiceProvider } from "@mainsail/validation";
import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";
import { Contracts } from "@mainsail/contracts";
import { schemas } from "./schemas";
import { Identifiers } from "@mainsail/constants";

describe<{
	app: Application;
	validator: Contracts.Crypto.Validator;
}>("Schemas", ({ it, assert, beforeEach }) => {
	beforeEach(async (context) => {
		context.app = new Application();
		await context.app.resolve(ValidationServiceProvider).register();

		context.validator = context.app.get<Contracts.Crypto.Validator>(Identifiers.Cryptography.Validator);

		for (const schema of Object.values({
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
