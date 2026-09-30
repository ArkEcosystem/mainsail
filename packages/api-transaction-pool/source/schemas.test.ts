import { describe } from "@mainsail/test-runner";

import { pagination } from "./schemas";

describe("Schemas", ({ it, assert }) => {
	const validate = (value: object, limit?: number) =>
		pagination.validate(value, {
			context: { configuration: { plugins: { pagination: { limit } } } },
		});

	// Joi returns a value even when validation fails, so the positive cases assert
	// the absence of an error as well.
	const assertValid = (result: { value: unknown; error?: unknown }, expected: object) => {
		assert.undefined(result.error);
		assert.equal(result.value, expected);
	};

	it("pagination - defaults the limit to the configured maximum when it is below 100", () => {
		assertValid(validate({}, 50), { limit: 50, page: 1 });
	});

	it("pagination - defaults the limit to 100 when the configured maximum is higher", () => {
		assertValid(validate({}, 500), { limit: 100, page: 1 });
	});

	it("pagination - defaults the limit to 100 when the configured maximum is missing", () => {
		assertValid(validate({}), { limit: 100, page: 1 });
		assertValid(pagination.validate({}), { limit: 100, page: 1 });
	});

	it("pagination - accepts a limit within the configured maximum", () => {
		assertValid(validate({ limit: 40 }, 50), { limit: 40, page: 1 });
	});

	it("pagination - rejects a limit above the configured maximum", () => {
		assert.defined(validate({ limit: 60 }, 50).error);
	});

	it("pagination - rejects a non-positive limit and page", () => {
		assert.defined(validate({ limit: 0 }, 50).error);
		assert.defined(validate({ page: 0 }, 50).error);
	});
});
