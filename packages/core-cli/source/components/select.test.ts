import prompts from "prompts";

import { Console, describe } from "../../../core-test-framework";
import { Identifiers } from "../ioc";
import { Select } from "./select";

describe<{
	component: Select;
	cli: Console;
}>("Log", ({ beforeEach, it, assert, spy }) => {
	beforeEach((context) => {
		context.cli = new Console();
		context.cli.app.rebind(Identifiers.Select).to(Select).inSingletonScope();
		context.component = context.cli.app.get(Identifiers.Select);
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
