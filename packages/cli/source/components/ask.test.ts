import prompts from "prompts";
import { Identifiers } from "@mainsail/constants";

import { describe } from "@mainsail/test-runner";
import { Ask } from "./ask";
import { Console } from "../test/index.js";

describe<{
	component: Ask;
}>("Ask", ({ beforeEach, it, assert }) => {
	beforeEach((context) => {
		const cli = new Console();
		cli.app.rebind(Identifiers.Cli.Component.Ask).to(Ask).inSingletonScope();
		context.component = cli.app.get(Identifiers.Cli.Component.Ask);
	});

	it("should render the component", async ({ component }) => {
		prompts.inject(["john doe"]);

		assert.equal(await component.render("Hello World"), "john doe");
	});
});
