import prompts from "prompts";
import { Identifiers } from "@mainsail/constants";

import { Console, describe } from "../../../test-framework/source";
import { AskDate } from "./ask-date";

describe<{
	component: AskDate;
}>("AskDate", ({ beforeEach, it, assert }) => {
	beforeEach((context) => {
		const cli = new Console();
		cli.app.rebind(Identifiers.Cli.Component.AskDate).to(AskDate).inSingletonScope();
		context.component = cli.app.get<AskDate>(Identifiers.Cli.Component.AskDate);
	});

	it("should render the component", async ({ component }) => {
		prompts.inject(["2020-01-01"]);

		assert.equal(await component.render("Hello World"), "2020-01-01");
	});
});
