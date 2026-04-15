import { Validator } from "./validator.js";

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

		for (const schema of Object.values(schemas)) {
			context.validator.addSchema(schema);
		}
	});

	it("alphanumeric - should be ok", ({ validator }) => {
		const validChars = "0123456789abcdefghijklmnopqrstuvwxyz";

		for (const char of validChars) {
			assert.undefined(validator.validate("alphanumeric", char).error);
			assert.undefined(validator.validate("alphanumeric", char.repeat(20)).error);
		}
	});

	it("alphanumeric - should not be ok", ({ validator }) => {
		const invalidChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

		for (const char of invalidChars) {
			assert.defined(validator.validate("alphanumeric", char).error);
			assert.defined(validator.validate("alphanumeric", char.repeat(20)).error);
		}

		assert.defined(validator.validate("address", 123).error);
		assert.defined(validator.validate("address", null).error);
		assert.defined(validator.validate("address").error);
		assert.defined(validator.validate("address", {}).error);
	});

	it("hex - should be ok", ({ validator }) => {
		const validChars = "0123456789abcdef";

		for (const char of validChars) {
			assert.undefined(validator.validate("hex", char).error);
			assert.undefined(validator.validate("hex", char.repeat(20)).error);
		}
	});

	it("hex - should not be ok", ({ validator }) => {
		assert.defined(validator.validate("hex", 123).error);
		assert.defined(validator.validate("hex", null).error);
		assert.defined(validator.validate("hex").error);
		assert.defined(validator.validate("hex", {}).error);

		const invalidChars = "ABCDEFGHIJKLghijkl!#$%&'|+/";

		for (const char of invalidChars) {
			assert.defined(validator.validate("hex", char).error);
			assert.defined(validator.validate("hex", char.repeat(20)).error);
		}
	});

	it("prefixedDataHex - should be ok", ({ validator }) => {
		const validValues = ["0x", "0x00", "0x0123", "0x0123456789abcdef"];

		for (const value of validValues) {
			assert.undefined(validator.validate("prefixedDataHex", value).error);
		}
	});

	it("prefixedDataHex - should not be ok", ({ validator }) => {
		const invalidValues = ["0x0", "0x000", "deadbeef", "0xGG", "0X00"];

		for (const value of invalidValues) {
			assert.defined(validator.validate("prefixedDataHex", value).error);
		}

		assert.defined(validator.validate("prefixedDataHex", 123).error);
		assert.defined(validator.validate("prefixedDataHex", null).error);
		assert.defined(validator.validate("prefixedDataHex").error);
		assert.defined(validator.validate("prefixedDataHex", {}).error);
	});

	it("prefixedQuantityHex - should be ok", ({ validator }) => {
		const validValues = ["0x0", "0x1", "0x01", "0x123456789abcdef"];

		for (const value of validValues) {
			assert.undefined(validator.validate("prefixedQuantityHex", value).error);
		}
	});

	it("prefixedQuantityHex - should not be ok", ({ validator }) => {
		const invalidValues = ["0x", "deadbeef", "0xGG", "0X01"];

		for (const value of invalidValues) {
			assert.defined(validator.validate("prefixedQuantityHex", value).error);
		}

		assert.defined(validator.validate("prefixedQuantityHex", 123).error);
		assert.defined(validator.validate("prefixedQuantityHex", null).error);
		assert.defined(validator.validate("prefixedQuantityHex").error);
		assert.defined(validator.validate("prefixedQuantityHex", {}).error);
	});
});
