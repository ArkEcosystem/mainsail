import prompts from "prompts";
import { Identifiers } from "@mainsail/constants";

import { describe } from "@mainsail/test-runner";
import { AskNumber } from "./ask-number";
import { Console } from "../test/index.js";

describe<{
	component: AskNumber;
}>("AskNumber", ({ beforeEach, it, assert }) => {
	beforeEach((context) => {
		const cli = new Console();
		cli.app.rebind(Identifiers.Cli.Component.AskNumber).to(AskNumber).inSingletonScope();
		context.component = cli.app.get(Identifiers.Cli.Component.AskNumber);
	});

	it("should render the component", async ({ component }) => {
		prompts.inject([123]);

		assert.equal(await component.render("Hello World"), 123);
	});
});
