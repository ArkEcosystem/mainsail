import prompts from "prompts";

import { describe } from "@mainsail/test-runner";
import { Identifiers } from "@mainsail/constants";
import { Select } from "./select";
import { Console } from "../test/index.js";

describe<{
	component: Select;
	cli: Console;
}>("Log", ({ beforeEach, it, assert, spy }) => {
	beforeEach((context) => {
		context.cli = new Console();
		context.cli.app.rebind(Identifiers.Cli.Component.Select).to(Select).inSingletonScope();
		context.component = context.cli.app.get(Identifiers.Cli.Component.Select);
	});

	it("should render the component", async ({ component, cli }) => {
		prompts.inject(["#0000ff"]);

		assert.equal(
			await component.render("Pick a color", [
				{ description: "This option has a description", title: "Red", value: "#ff0000" },
				{ disabled: true, title: "Green", value: "#00ff00" },
				{ title: "Blue", value: "#0000ff" },
			]),
			"#0000ff",
		);
	});
});
