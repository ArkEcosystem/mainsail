import prompts from "prompts";

import { describe } from "@mainsail/test-runner";
import { Identifiers } from "@mainsail/constants";
import { Toggle } from "./toggle";
import { Console } from "../test/index.js";

describe<{
	component: Toggle;
	cli: Console;
}>("Log", ({ beforeEach, it, assert, spy }) => {
	beforeEach((context) => {
		context.cli = new Console();
		context.cli.app.rebind(Identifiers.Cli.Component.Toggle).to(Toggle).inSingletonScope();
		context.component = context.cli.app.get(Identifiers.Cli.Component.Toggle);
	});

	it("should render the component", async ({ component, cli }) => {
		prompts.inject(["yes"]);

		assert.equal(await component.render("Hello World"), "yes");
	});
});
