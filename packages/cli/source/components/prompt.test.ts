import prompts from "prompts";

import { Console, describe } from "../../../test-framework/source";
import { Identifiers } from "../ioc/index.js";
import { Prompt } from "./prompt.js";

describe<{
	component: Prompt;
	cli: Console;
}>("Log", ({ beforeEach, it, assert, spy }) => {
	beforeEach((context) => {
		context.cli = new Console();
		context.cli.app.rebind(Identifiers.Prompt).to(Prompt).inSingletonScope();
		context.component = context.cli.app.get(Identifiers.Prompt);
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
