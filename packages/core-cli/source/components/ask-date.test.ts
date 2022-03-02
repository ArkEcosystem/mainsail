import prompts from "prompts";

import { Console, describe } from "../../../core-test-framework";
import { Identifiers } from "../ioc";
import { AskDate } from "./ask-date";

describe<{
	component: AskDate;
}>("AskDate", ({ beforeEach, it, assert }) => {
	beforeEach((context) => {
		const cli = new Console();
		cli.app.rebind(Identifiers.AskDate).to(AskDate).inSingletonScope();
		context.component = cli.app.get<AskDate>(Identifiers.AskDate);
	});

	it("should render the component", async ({ component }) => {
		prompts.inject(["2020-01-01"]);

		assert.equal(await component.render("Hello World"), "2020-01-01");
	});
});
