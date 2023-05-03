import prompts from "prompts";

import { Console, describe } from "../../../core-test-framework";
import { Identifiers } from "../ioc";
import { AutoComplete } from "./auto-complete";

describe<{
	component: AutoComplete;
}>("AutoComplete", ({ beforeEach, it, assert }) => {
	beforeEach((context) => {
		const cli = new Console();
		cli.app.rebind(Identifiers.AutoComplete).to(AutoComplete).inSingletonScope();
		context.component = cli.app.get(Identifiers.AutoComplete);
	});

	it("should render the component", async ({ component }) => {
		prompts.inject(["Clooney"]);

		assert.equal(
			await component.render("Pick your favorite actor", [
				{ title: "Cage" },
				{ title: "Clooney" },
				{ title: "Gyllenhaal" },
				{ title: "Gibson" },
				{ title: "Grant" },
			]),
			"Clooney",
		);
	});
});
