import prompts from "prompts";
import { Identifiers } from "@mainsail/constants";

import { describe } from "@mainsail/test-runner";
import { AutoComplete } from "./auto-complete";
import { Console } from "../test/index.js";

describe<{
	component: AutoComplete;
}>("AutoComplete", ({ beforeEach, it, assert }) => {
	beforeEach((context) => {
		const cli = new Console();
		cli.app.rebind(Identifiers.Cli.Component.AutoComplete).to(AutoComplete).inSingletonScope();
		context.component = cli.app.get(Identifiers.Cli.Component.AutoComplete);
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
