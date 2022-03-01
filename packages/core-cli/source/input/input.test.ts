import Joi from "joi";

import { Console, describe } from "../../../core-test-framework";
import { InputDefinition } from "./definition";
import { Input } from "./input";

describe<{
	cli: Console;
}>("Input", ({ beforeEach, it, assert }) => {
	beforeEach((context) => {
		context.cli = new Console();
	});

	const createInput = (cli, arguments_?: string[]): Input => {
		const definition = new InputDefinition();
		definition.setArgument("firstName", "description", Joi.string());
		definition.setArgument("lastName", "description", Joi.string());
		definition.setFlag("hello", "description", Joi.string());
		definition.setFlag("firstName", "description", Joi.string());
		definition.setFlag("lastName", "description", Joi.string());

		const input = cli.app.resolve(Input);
		input.parse(arguments_ || ["env:paths", "john", "doe", "--hello=world"], definition);
		input.bind();
		input.validate();

		return input;
	};

	it("should parse, bind and validate the arguments and flags", ({ cli }) => {
		const input = createInput(cli);

		assert.equal(input.getArgument("firstName"), "john");
		assert.equal(input.getArgument("lastName"), "doe");
		assert.equal(input.getFlag("hello"), "world");
	});

	it("should parse, bind and validate the arguments", ({ cli }) => {
		const definition = new InputDefinition();
		definition.setArgument("firstName", "description", Joi.string());
		definition.setArgument("lastName", "description", Joi.string());

		const input = cli.app.resolve(Input);
		input.parse(["env:paths", "john", "doe"], definition);
		input.bind();
		input.validate();

		assert.equal(input.getArgument("firstName"), "john");
		assert.equal(input.getArgument("lastName"), "doe");
	});

	it("should parse, bind and validate the flags", ({ cli }) => {
		const definition = new InputDefinition();
		definition.setFlag("hello", "description", Joi.string());

		const input = cli.app.resolve(Input);
		input.parse(["env:paths", "--hello=world"], definition);
		input.bind();
		input.validate();

		assert.equal(input.getFlag("hello"), "world");
	});

	it("should parse, bind and validate nothing", ({ cli }) => {
		const input = cli.app.resolve(Input);
		input.parse(["env:paths"], new InputDefinition());
		input.bind();
		input.validate();

		assert.empty(input.getArguments());
	});

	it("should get all arguments", ({ cli }) => {
		const input = createInput(cli);

		assert.equal(input.getArguments(), {
			firstName: "john",
			lastName: "doe",
		});
	});

	it("should get all arguments merged with the given values", ({ cli }) => {
		const input = createInput(cli);

		assert.equal(input.getArguments({ middleName: "jane" }), {
			firstName: "john",
			lastName: "doe",
			middleName: "jane",
		});
	});

	it("should get an argument by name", ({ cli }) => {
		const input = createInput(cli);

		assert.equal(input.getArgument("firstName"), "john");
	});

	it("should set the value of an argument by name", ({ cli }) => {
		const input = createInput(cli);

		assert.equal(input.getArgument("firstName"), "john");

		input.setArgument("firstName", "jane");

		assert.equal(input.getArgument("firstName"), "jane");
	});

	it("should check if an argument exists", ({ cli }) => {
		const input = createInput(cli);

		assert.false(input.hasArgument("middleName"));

		input.setArgument("middleName", "jane");

		assert.true(input.hasArgument("middleName"));
	});

	it("should get all flags", ({ cli }) => {
		const input = createInput(cli, ["env:paths", "--firstName=john", "--lastName=doe"]);

		assert.equal(input.getFlags(), {
			firstName: "john",
			lastName: "doe",
			v: 0,
		});
	});

	it("should get all flags merged with the given values", ({ cli }) => {
		const input = createInput(cli, ["env:paths", "--firstName=john", "--lastName=doe"]);

		assert.equal(input.getFlags({ middleName: "jane" }), {
			firstName: "john",
			lastName: "doe",
			middleName: "jane",
			v: 0,
		});
	});

	it("should get a flag by name", ({ cli }) => {
		const input = createInput(cli, ["env:paths", "--firstName=john", "--lastName=doe"]);

		assert.equal(input.getFlag("firstName"), "john");
	});

	it("should set the value of a flag by name", ({ cli }) => {
		const input = createInput(cli, ["env:paths", "--firstName=john", "--lastName=doe"]);

		assert.equal(input.getFlag("firstName"), "john");

		input.setFlag("firstName", "jane");

		assert.equal(input.getFlag("firstName"), "jane");
	});

	it("should check if a flag exists", ({ cli }) => {
		const input = createInput(cli, ["env:paths", "--firstName=john", "--lastName=doe"]);

		assert.false(input.hasFlag("middleName"));

		input.setFlag("middleName", "jane");

		assert.true(input.hasFlag("middleName"));
	});
});
