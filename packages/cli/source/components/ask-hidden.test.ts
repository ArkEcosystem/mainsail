import prompts from "prompts";

import { Console, describe } from "../../../test-framework";
import { Identifiers } from "../ioc/index.js";
import { AskHidden } from "./ask-hidden";

describe<{
	component: AskHidden;
}>("AskHidden", ({ beforeEach, it, assert }) => {
	beforeEach((context) => {
		const cli = new Console();
		cli.app.rebind(Identifiers.AskHidden).to(AskHidden).inSingletonScope();
		context.component = cli.app.get(Identifiers.AskHidden);
	});

	it("should render the component", async ({ component }) => {
		prompts.inject(["hidden"]);

		assert.equal(await component.render("Hello World"), "hidden");
	});
});
