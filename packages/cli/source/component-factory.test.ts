import { Console, describe } from "@mainsail/test-framework";
import { ComponentFactory } from "./component-factory";
import { Identifiers } from "@mainsail/constants";

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
			["appHeader", Identifiers.Cli.Component.AppHeader],
			["ask", Identifiers.Cli.Component.Ask],
			["askDate", Identifiers.Cli.Component.AskDate],
			["askHidden", Identifiers.Cli.Component.AskHidden],
			["askNumber", Identifiers.Cli.Component.AskNumber],
			["askPassword", Identifiers.Cli.Component.AskPassword],
			["autoComplete", Identifiers.Cli.Component.AutoComplete],
			["box", Identifiers.Cli.Component.Box],
			["clear", Identifiers.Cli.Component.Clear],
			["confirm", Identifiers.Cli.Component.Confirm],
			["error", Identifiers.Cli.Component.Error],
			["fatal", Identifiers.Cli.Component.Fatal],
			["info", Identifiers.Cli.Component.Info],
			["listing", Identifiers.Cli.Component.Listing],
			["log", Identifiers.Cli.Component.Log],
			["multiSelect", Identifiers.Cli.Component.MultiSelect],
			["newLine", Identifiers.Cli.Component.NewLine],
			["prompt", Identifiers.Cli.Component.Prompt],
			["select", Identifiers.Cli.Component.Select],
			["spinner", Identifiers.Cli.Component.Spinner],
			["success", Identifiers.Cli.Component.Success],
			["table", Identifiers.Cli.Component.Table],
			["taskList", Identifiers.Cli.Component.TaskList],
			["title", Identifiers.Cli.Component.Title],
			["toggle", Identifiers.Cli.Component.Toggle],
			["warning", Identifiers.Cli.Component.Warning],
		],
	);
});
