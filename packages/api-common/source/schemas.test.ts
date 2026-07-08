import Joi from "joi";

import { describe } from "@mainsail/test-runner";
import * as schemas from "./schemas";

describe<{}>("Schemas", ({ it, assert }) => {
	describe("createRangeCriteriaSchema", () => {
		it("should be valid", () => {
			const schema = schemas.createRangeCriteriaSchema(Joi.number().integer().min(1));

			const result = schema.validate({ from: 1, to: 2 });

			assert.equal(result, {
				value: {
					from: 1,
					to: 2,
				},
			});
		});

		it("should be invalid if from doesn't satisfy condition", () => {
			const schema = schemas.createRangeCriteriaSchema(Joi.number().integer().min(1));

			const result = schema.validate({ from: 0, to: 2 });

			assert.equal(result.error!.message, '"from" must be greater than or equal to 1');
		});

		it("should be invalid if to doesn't satisfy condition", () => {
			const schema = schemas.createRangeCriteriaSchema(Joi.number().integer().min(1));

			const result = schema.validate({ from: 1, to: 0 });

			assert.equal(result.error!.message, '"to" must be greater than or equal to 1');
		});
	});

	describe("createSortingSchema", () => {
		const testCriteriaSchemaObject = {
			username: Joi.string().max(256),
		};

		it("should use asc direction if direction is not present", () => {
			const sortingSchema = schemas.createSortingSchema(testCriteriaSchemaObject);

			const result = sortingSchema.validate({ orderBy: "username" });

			assert.equal(result, {
				value: {
					orderBy: "username",
				},
			});
		});

		it("should use given direction", () => {
			const sortingSchema = schemas.createSortingSchema(testCriteriaSchemaObject);

			const result = sortingSchema.validate({ orderBy: "username:desc" });

			assert.equal(result, {
				value: {
					orderBy: "username:desc",
				},
			});
		});

		it("should return empty order if orderBy is empty string", () => {
			const sortingSchema = schemas.createSortingSchema(testCriteriaSchemaObject);

			const result = sortingSchema.validate({ orderBy: "" });

			assert.equal(result, {
				value: {
					orderBy: [],
				},
			});
		});

		it("should contain error if direction is unknown", () => {
			const sortingSchema = schemas.createSortingSchema(testCriteriaSchemaObject);

			const result = sortingSchema.validate({ orderBy: "username:invalid" });

			assert.equal(result.error!.message, "Unexpected orderBy direction 'invalid' for property 'username'");
		});

		it("should contain error if property is unknown", () => {
			const sortingSchema = schemas.createSortingSchema(testCriteriaSchemaObject);

			const result = sortingSchema.validate({ orderBy: "invalid:asc" });

			assert.equal(result.error!.message, "Unknown orderBy property 'invalid'");
		});

		it("should return orderBy if property is defined in wildcardPaths", () => {
			const sortingSchema = schemas.createSortingSchema(testCriteriaSchemaObject, ["invalid"]);

			const result = sortingSchema.validate({ orderBy: "invalid.username:asc" });

			assert.equal(result, {
				value: {
					orderBy: "invalid.username:asc",
				},
			});
		});

		it("should handle multiple comma-separated properties", () => {
			const sortingSchema = schemas.createSortingSchema({
				name: Joi.string(),
				username: Joi.string(),
			});

			const result = sortingSchema.validate({ orderBy: "username:asc,name:desc" });

			assert.equal(result, {
				value: {
					orderBy: "username:asc,name:desc",
				},
			});
		});

		it("should handle array orderBy input", () => {
			const sortingSchema = schemas.createSortingSchema({
				name: Joi.string(),
				username: Joi.string(),
			});

			const result = sortingSchema.validate({ orderBy: ["username:asc", "name:desc"] });

			assert.equal(result, {
				value: {
					orderBy: ["username:asc", "name:desc"],
				},
			});
		});

		it("should build nested exact paths from a nested schema object", () => {
			const sortingSchema = schemas.createSortingSchema({
				wallet: {
					balance: Joi.string(),
				},
			});

			const result = sortingSchema.validate({ orderBy: "wallet.balance:asc" });

			assert.equal(result, {
				value: {
					orderBy: "wallet.balance:asc",
				},
			});
		});

		it("should contain error if property fails the property regex via wildcard", () => {
			const sortingSchema = schemas.createSortingSchema(testCriteriaSchemaObject, ["data"]);

			// passes the wildcard check (starts with "data.") but fails regex (contains digit)
			const result = sortingSchema.validate({ orderBy: "data.abc1:asc" });

			assert.equal(result.error!.message, "Invalid property name 'data.abc1'");
		});
	});

	describe("createCriteriaSchema", () => {
		it("should validate a single value for a flat schema", () => {
			const schema = schemas.createCriteriaSchema({ username: Joi.string() });

			const result = schema.validate({ username: "alice" });

			assert.equal(result, {
				value: {
					username: ["alice"],
				},
			});
		});

		it("should validate an array value for a flat schema", () => {
			const schema = schemas.createCriteriaSchema({ username: Joi.string() });

			const result = schema.validate({ username: ["alice", "bob"] });

			assert.equal(result, {
				value: {
					username: ["alice", "bob"],
				},
			});
		});

		it("should be invalid for a flat schema", () => {
			const schema = schemas.createCriteriaSchema({ username: Joi.string() });

			const result = schema.validate({ username: 123 });

			assert.defined(result.error);
		});

		it("should validate a nested schema object (recursive branch)", () => {
			const schema = schemas.createCriteriaSchema({
				wallet: {
					address: Joi.string(),
				},
			});

			const result = schema.validate({ wallet: { address: "0xabc" } });

			assert.equal(result, {
				value: {
					wallet: [{ address: ["0xabc"] }],
				},
			});
		});

		it("should be invalid for a nested schema object", () => {
			const schema = schemas.createCriteriaSchema({
				wallet: {
					address: Joi.string(),
				},
			});

			const result = schema.validate({ wallet: { address: 123 } });

			assert.defined(result.error);
		});
	});

	describe("pagination", () => {
		const context = { context: { configuration: { plugins: { pagination: { limit: 100 } } } } };

		it("should apply defaults for page and limit", () => {
			const result = schemas.pagination.validate({}, context);

			assert.undefined(result.error);
			assert.is(result.value.page, 1);
			assert.is(result.value.limit, 100);
		});

		it("should accept a valid offset", () => {
			const result = schemas.pagination.validate({ offset: 0 }, context);

			assert.undefined(result.error);
			assert.is(result.value.offset, 0);
		});

		it("should reject a negative offset", () => {
			const result = schemas.pagination.validate({ offset: -1 }, context);

			assert.defined(result.error);
		});

		it("should reject a limit exceeding the configured max", () => {
			const result = schemas.pagination.validate({ limit: 101 }, context);

			assert.defined(result.error);
		});

		it("should cap the default limit at a configured max below 100", () => {
			const result = schemas.pagination.validate(
				{},
				{ context: { configuration: { plugins: { pagination: { limit: 50 } } } } },
			);

			assert.undefined(result.error);
			assert.is(result.value.limit, 50);
		});

		it("should keep the default limit at 100 when the configured max is higher", () => {
			const result = schemas.pagination.validate(
				{},
				{ context: { configuration: { plugins: { pagination: { limit: 500 } } } } },
			);

			assert.undefined(result.error);
			assert.is(result.value.limit, 100);
		});

		it("should default the limit to 100 when the configuration context is missing", () => {
			const result = schemas.pagination.validate({});

			assert.undefined(result.error);
			assert.is(result.value.limit, 100);
		});

		it("should clamp the default limit to 1 when the configured max is 0", () => {
			const result = schemas.pagination.validate(
				{},
				{ context: { configuration: { plugins: { pagination: { limit: 0 } } } } },
			);

			assert.undefined(result.error);
			assert.is(result.value.limit, 1);
		});

		it("should reject a non-positive page", () => {
			const result = schemas.pagination.validate({ page: 0 }, context);

			assert.defined(result.error);
		});
	});

	describe("equalCriteria / containsCriteria", () => {
		it("equalCriteria should return the value unchanged", () => {
			const item = Joi.string();

			assert.is(schemas.equalCriteria(item), item);
		});

		it("containsCriteria should return the value unchanged", () => {
			const item = Joi.string();

			assert.is(schemas.containsCriteria(item), item);
		});
	});

	describe("numericCriteria", () => {
		const item = Joi.number().integer();

		it("should validate a plain value", () => {
			const schema = schemas.numericCriteria(item);

			assert.equal(schema.validate(5), { value: 5 });
		});

		it("should validate { from }", () => {
			const schema = schemas.numericCriteria(item);

			assert.equal(schema.validate({ from: 1 }), { value: { from: 1 } });
		});

		it("should validate { to }", () => {
			const schema = schemas.numericCriteria(item);

			assert.equal(schema.validate({ to: 2 }), { value: { to: 2 } });
		});

		it("should validate { from, to }", () => {
			const schema = schemas.numericCriteria(item);

			assert.equal(schema.validate({ from: 1, to: 2 }), { value: { from: 1, to: 2 } });
		});

		it("should be invalid for an unexpected shape", () => {
			const schema = schemas.numericCriteria(item);

			const result = schema.validate({ unexpected: 1 });

			assert.defined(result.error);
		});
	});

	describe("orCriteria", () => {
		const item = Joi.string();

		it("should validate a single criteria", () => {
			const schema = schemas.orCriteria(item);

			assert.equal(schema.validate("alice"), { value: "alice" });
		});

		it("should validate an array of criteria", () => {
			const schema = schemas.orCriteria(item);

			assert.equal(schema.validate(["alice", "bob"]), { value: ["alice", "bob"] });
		});
	});

	describe("orEqualCriteria", () => {
		const item = Joi.string();

		it("should validate a single value", () => {
			const schema = schemas.orEqualCriteria(item);

			assert.equal(schema.validate("alice"), { value: "alice" });
		});

		it("should validate an array of values", () => {
			const schema = schemas.orEqualCriteria(item);

			assert.equal(schema.validate(["alice", "bob"]), { value: ["alice", "bob"] });
		});
	});

	describe("orNumericCriteria", () => {
		const item = Joi.number().integer();

		it("should validate a single value", () => {
			const schema = schemas.orNumericCriteria(item);

			assert.equal(schema.validate(5), { value: 5 });
		});

		it("should validate a single range", () => {
			const schema = schemas.orNumericCriteria(item);

			assert.equal(schema.validate({ from: 1, to: 2 }), { value: { from: 1, to: 2 } });
		});

		it("should validate an array of values", () => {
			const schema = schemas.orNumericCriteria(item);

			assert.equal(schema.validate([1, 2]), { value: [1, 2] });
		});
	});

	describe("orContainsCriteria", () => {
		const item = Joi.string();

		it("should validate a single value", () => {
			const schema = schemas.orContainsCriteria(item);

			assert.equal(schema.validate("alice"), { value: "alice" });
		});

		it("should validate an array of values", () => {
			const schema = schemas.orContainsCriteria(item);

			assert.equal(schema.validate(["alice", "bob"]), { value: ["alice", "bob"] });
		});
	});

	describe("addressSchema", () => {
		it("should validate a 42-char 0x-prefixed hex string", () => {
			const result = schemas.addressSchema.validate(`0x${"a".repeat(40)}`);

			assert.undefined(result.error);
			assert.is(result.value, `0x${"a".repeat(40)}`);
		});

		it("should be invalid for a wrong length", () => {
			const result = schemas.addressSchema.validate(`0x${"a".repeat(38)}`);

			assert.defined(result.error);
		});

		it("should be invalid without the 0x prefix", () => {
			const result = schemas.addressSchema.validate("a".repeat(42));

			assert.defined(result.error);
		});
	});
});
