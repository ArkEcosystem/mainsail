import { describe } from "../../../../../core-test-framework";

import { NullValidator } from "./null";

describe("NullValidator.validate", ({ assert, beforeEach, it }) => {
	it("should return undefined", () => {
		const driver = new NullValidator();
		const result = driver.validate({}, {});
		assert.undefined(result);
	});

	it("should return false", () => {
		const driver = new NullValidator();
		const result = driver.passes();
		assert.false(result);
	});

	it("should return true", () => {
		const driver = new NullValidator();
		const result = driver.fails();
		assert.true(result);
	});

	it("should return empty object", () => {
		const driver = new NullValidator();
		const result = driver.failed();
		assert.equal(result, {});
	});

	it("should return empty object", () => {
		const driver = new NullValidator();
		const result = driver.errors();
		assert.equal(result, {});
	});

	it("should return undefined", () => {
		const driver = new NullValidator();
		const result = driver.valid();
		assert.undefined(result);
	});

	it("should return empty object", () => {
		const driver = new NullValidator();
		const result = driver.invalid();
		assert.equal(result, {});
	});

	it("should return empty object", () => {
		const driver = new NullValidator();
		const result = driver.attributes();
		assert.equal(result, {});
	});
});
