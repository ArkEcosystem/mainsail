import Joi from "joi";

import { describe } from "../../../core-test-framework";
import { InputDefinition } from "./definition";

describe("InputDefinition", ({ it, assert }) => {
	it("should get all arguments", () => {
		const definition = new InputDefinition();
		definition.setArgument("firstName", "description", Joi.string());
		definition.setArgument("lastName", "description", Joi.string());

		assert.equal(definition.getArguments(), {
			firstName: { description: "description", schema: Joi.string() },
			lastName: { description: "description", schema: Joi.string() },
		});
	});

	it("should get the value of an argument by name", () => {
		const definition = new InputDefinition();
		definition.setArgument("firstName", "description", Joi.string());

		assert.equal(definition.getArgument("firstName"), { description: "description", schema: Joi.string() });
	});

	it("should set the value of an argument by name", () => {
		const definition = new InputDefinition();
		definition.setArgument("firstName", "description", Joi.string());

		assert.equal(definition.getArgument("firstName"), { description: "description", schema: Joi.string() });

		definition.setArgument("firstName", "description", Joi.number());

		assert.equal(definition.getArgument("firstName"), { description: "description", schema: Joi.number() });
	});

	it("should check if an argument exists", () => {
		const definition = new InputDefinition();

		assert.false(definition.hasArgument("middleName"));

		definition.setArgument("middleName", "description", Joi.number());

		assert.true(definition.hasArgument("middleName"));
	});

	it("should get all flags", () => {
		const definition = new InputDefinition();
		definition.setFlag("firstName", "description", Joi.string());
		definition.setFlag("lastName", "description", Joi.string());

		assert.equal(definition.getFlags(), {
			firstName: { description: "description", schema: Joi.string() },
			lastName: { description: "description", schema: Joi.string() },
		});
	});

	it("should get the value of a flag by name", () => {
		const definition = new InputDefinition();
		definition.setFlag("firstName", "description", Joi.string());

		assert.equal(definition.getFlag("firstName"), { description: "description", schema: Joi.string() });
	});

	it("should set the value of a flag by name", () => {
		const definition = new InputDefinition();
		definition.setFlag("firstName", "description", Joi.string());

		assert.equal(definition.getFlag("firstName"), { description: "description", schema: Joi.string() });

		definition.setFlag("firstName", "description", Joi.number());

		assert.equal(definition.getFlag("firstName"), { description: "description", schema: Joi.number() });
	});

	it("should check if a flag exists", () => {
		const definition = new InputDefinition();

		assert.false(definition.hasFlag("middleName"));

		definition.setFlag("middleName", "description", Joi.number());

		assert.true(definition.hasFlag("middleName"));
	});
});
