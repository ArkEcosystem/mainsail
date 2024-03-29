import prompts from "prompts";

import { Console, describe } from "../../../test-framework/source";
import { Identifiers } from "../ioc/index.js";
import { Toggle } from "./toggle";

describe<{
	component: Toggle;
	cli: Console;
}>("Log", ({ beforeEach, it, assert, spy }) => {
	beforeEach((context) => {
		context.cli = new Console();
		context.cli.app.rebind(Identifiers.Toggle).to(Toggle).inSingletonScope();
		context.component = context.cli.app.get(Identifiers.Toggle);
	});

	it("should render the component", async ({ component, cli }) => {
		prompts.inject(["yes"]);

		assert.equal(await component.render("Hello World"), "yes");
	});
});
