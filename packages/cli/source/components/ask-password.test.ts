import prompts from "prompts";
import { Identifiers } from "@mainsail/constants";

import { Console, describe } from "../../../test-framework/source";
import { AskPassword } from "./ask-password";

describe<{
	component: AskPassword;
}>("AskPassword", ({ beforeEach, it, assert }) => {
	beforeEach((context) => {
		const cli = new Console();
		cli.app.rebind(Identifiers.Cli.Component.AskPassword).to(AskPassword).inSingletonScope();
		context.component = cli.app.get(Identifiers.Cli.Component.AskPassword);
	});

	it("should render the component", async ({ component }) => {
		prompts.inject(["password"]);

		assert.equal(await component.render("Hello World"), "password");
	});
});
