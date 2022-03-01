import prompts from "prompts";

import { Console, describe } from "../../../core-test-framework";
import { Identifiers } from "../ioc";
import { AskPassword } from "./ask-password";

describe<{
	component: AskPassword;
}>("AskPassword", ({ beforeEach, it, assert }) => {
	beforeEach((context) => {
		const cli = new Console();
		cli.app.rebind(Identifiers.AskPassword).to(AskPassword).inSingletonScope();
		context.component = cli.app.get(Identifiers.AskPassword);
	});

	it("should render the component", async ({ component }) => {
		prompts.inject(["password"]);

		assert.equal(await component.render("Hello World"), "password");
	});
});
