import prompts from "prompts";
import { Identifiers } from "@mainsail/constants";

import { Console, describe } from "@mainsail/test-framework";
import { Confirm } from "./confirm";

describe<{
	component: Confirm;
	cli: Console;
}>("Confirm", ({ beforeEach, it, assert, spy }) => {
	beforeEach((context) => {
		context.cli = new Console();
		context.cli.app.rebind(Identifiers.Cli.Component.Confirm).to(Confirm).inSingletonScope();
		context.component = context.cli.app.get(Identifiers.Cli.Component.Confirm);
	});

	it("should render the component", async ({ component, cli }) => {
		prompts.inject([true]);

		assert.true(await component.render("Hello World"));
	});
});
