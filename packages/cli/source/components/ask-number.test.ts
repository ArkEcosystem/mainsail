import prompts from "prompts";

import { Console, describe } from "../../../test-framework/source";
import { Identifiers } from "../ioc/index.js";
import { AskNumber } from "./ask-number";

describe<{
	component: AskNumber;
}>("AskNumber", ({ beforeEach, it, assert }) => {
	beforeEach((context) => {
		const cli = new Console();
		cli.app.rebind(Identifiers.AskNumber).to(AskNumber).inSingletonScope();
		context.component = cli.app.get(Identifiers.AskNumber);
	});

	it("should render the component", async ({ component }) => {
		prompts.inject([123]);

		assert.equal(await component.render("Hello World"), 123);
	});
});
