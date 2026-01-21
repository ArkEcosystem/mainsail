import prompts from "prompts";
import { Identifiers } from "@mainsail/constants";

import { Console, describe } from "@mainsail/test-framework";
import { AskHidden } from "./ask-hidden";

describe<{
	component: AskHidden;
}>("AskHidden", ({ beforeEach, it, assert }) => {
	beforeEach((context) => {
		const cli = new Console();
		cli.app.rebind(Identifiers.Cli.Component.AskHidden).to(AskHidden).inSingletonScope();
		context.component = cli.app.get(Identifiers.Cli.Component.AskHidden);
	});

	it("should render the component", async ({ component }) => {
		prompts.inject(["hidden"]);

		assert.equal(await component.render("Hello World"), "hidden");
	});
});
