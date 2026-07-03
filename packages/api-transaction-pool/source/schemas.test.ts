import { describe } from "@mainsail/test-runner";

import { pagination } from "./schemas";

describe("Schemas", ({ it, assert }) => {
	const validate = (value: object, limit?: number) =>
		pagination.validate(value, {
			context: { configuration: { plugins: { pagination: { limit } } } },
		});

	it("pagination - defaults the limit to the configured maximum when it is below 100", () => {
		assert.equal(validate({}, 50).value, { limit: 50, page: 1 });
	});

	it("pagination - defaults the limit to 100 when the configured maximum is higher", () => {
		assert.equal(validate({}, 500).value, { limit: 100, page: 1 });
	});

	it("pagination - defaults the limit to 100 when the configured maximum is missing", () => {
		assert.equal(validate({}).value, { limit: 100, page: 1 });
		assert.equal(pagination.validate({}).value, { limit: 100, page: 1 });
	});

	it("pagination - accepts a limit within the configured maximum", () => {
		assert.equal(validate({ limit: 40 }, 50).value, { limit: 40, page: 1 });
	});

	it("pagination - rejects a limit above the configured maximum", () => {
		assert.defined(validate({ limit: 60 }, 50).error);
	});

	it("pagination - rejects a non-positive limit and page", () => {
		assert.defined(validate({ limit: 0 }, 50).error);
		assert.defined(validate({ page: 0 }, 50).error);
	});
});
