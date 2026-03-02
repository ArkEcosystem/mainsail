import prompts from "prompts";

import { describe } from "@mainsail/test-runner";
import { Identifiers } from "@mainsail/constants";
import { Prompt } from "./prompt.js";
import { Console } from "../test/index.js";

describe<{
	component: Prompt;
	cli: Console;
}>("Prompt", ({ beforeEach, it, assert, spy }) => {
	beforeEach((context) => {
		context.cli = new Console();
		context.cli.app.rebind(Identifiers.Cli.Component.Prompt).to(Prompt).inSingletonScope();
		context.component = context.cli.app.get(Identifiers.Cli.Component.Prompt);
	});

	it("should render the component", async ({ component, cli }) => {
		prompts.inject(["johndoe"]);

		assert.equal(
			await component.render({
				message: "What's your twitter handle?",
				name: "value",
				type: "text",
			}),
			{ value: "johndoe" },
		);
	});
});
