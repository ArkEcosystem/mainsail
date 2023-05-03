import { Console, describe } from "../../core-test-framework";
import { ComponentFactory } from "./component-factory";
import { Identifiers } from "./ioc";

describe("ComponentFactory", ({ assert, beforeEach, each, it, stub }) => {
	beforeEach((context) => {
		context.cli = new Console();
	});

	it("should create an instance", (context) => {
		assert.instance(context.cli.app.resolve(ComponentFactory), ComponentFactory);
	});

	each(
		"render component",
		async ({ context, dataset }) => {
			const spy = stub(context.cli.app.get(dataset[1]), "render").callsFake(() => {});

			await context.cli.app.resolve(ComponentFactory)[dataset[0]]();

			spy.calledOnce();
		},
		[
			["appHeader", Identifiers.AppHeader],
			["ask", Identifiers.Ask],
			["askDate", Identifiers.AskDate],
			["askHidden", Identifiers.AskHidden],
			["askNumber", Identifiers.AskNumber],
			["askPassword", Identifiers.AskPassword],
			["autoComplete", Identifiers.AutoComplete],
			["box", Identifiers.Box],
			["clear", Identifiers.Clear],
			["confirm", Identifiers.Confirm],
			["error", Identifiers.Error],
			["fatal", Identifiers.Fatal],
			["info", Identifiers.Info],
			["listing", Identifiers.Listing],
			["log", Identifiers.Log],
			["multiSelect", Identifiers.MultiSelect],
			["newLine", Identifiers.NewLine],
			["prompt", Identifiers.Prompt],
			["select", Identifiers.Select],
			["spinner", Identifiers.Spinner],
			["success", Identifiers.Success],
			["table", Identifiers.Table],
			["taskList", Identifiers.TaskList],
			["title", Identifiers.Title],
			["toggle", Identifiers.Toggle],
			["warning", Identifiers.Warning],
		],
	);
});
