import prompts from "prompts";
import { Identifiers } from "@mainsail/constants";

import { describe } from "@mainsail/test-runner";
import { AskHidden } from "./ask-hidden";
import { Console } from "../test/index.js";

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
