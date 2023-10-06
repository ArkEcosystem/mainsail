import Joi from "joi";
import { describe } from "../../test-framework";
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
					orderBy: [
						{
							property: "username",
							direction: "asc",
						},
					],
				},
			});
		});

		it("should use given direction", () => {
			const sortingSchema = schemas.createSortingSchema(testCriteriaSchemaObject);

			const result = sortingSchema.validate({ orderBy: "username:desc" });

			assert.equal(result, {
				value: {
					orderBy: [
						{
							property: "username",
							direction: "desc",
						},
					],
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
					orderBy: [
						{
							property: "invalid.username",
							direction: "asc",
						},
					],
				},
			});
		});
	});
});
