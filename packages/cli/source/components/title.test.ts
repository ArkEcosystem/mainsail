import { yellow } from "kleur/colors";

import { describe } from "@mainsail/test-runner";
import { Identifiers } from "@mainsail/constants";
import { Title } from "./title";
import { Console } from "../test/index.js";

describe<{
	component: Title;
	cli: Console;
}>("Title", ({ beforeEach, it, assert, spy }) => {
	beforeEach((context) => {
		context.cli = new Console();
		context.cli.app.rebind(Identifiers.Cli.Component.Title).to(Title).inSingletonScope();
		context.component = context.cli.app.get(Identifiers.Cli.Component.Title);
	});

	it("should render the component", async ({ component, cli }) => {
		const spyOnLog = spy(cli.app.get(Identifiers.Cli.Service.Logger), "log");

		await component.render("Hello World");

		spyOnLog.calledWith(yellow("Hello World"));
		spyOnLog.calledWith(yellow("==========="));
	});
});
