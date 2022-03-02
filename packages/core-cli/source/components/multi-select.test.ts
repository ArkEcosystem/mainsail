import prompts from "prompts";

import { Console, describe } from "../../../core-test-framework";
import { Identifiers } from "../ioc";
import { MultiSelect } from "./multi-select";

describe<{
	component: MultiSelect;
	cli: Console;
}>("MultiSelect", ({ beforeEach, it, assert, spy }) => {
	beforeEach((context) => {
		context.cli = new Console();
		context.cli.app.rebind(Identifiers.MultiSelect).to(MultiSelect).inSingletonScope();
		context.component = context.cli.app.get(Identifiers.MultiSelect);
	});

	it("should render the component", async ({ component }) => {
		prompts.inject([["#ff0000", "#0000ff"]]);

		assert.equal(
			await component.render("Pick Colors", [
				{ title: "Red", value: "#ff0000" },
				{ disabled: true, title: "Green", value: "#00ff00" },
				{ selected: true, title: "Blue", value: "#0000ff" },
			]),
			["#ff0000", "#0000ff"],
		);
	});
});
