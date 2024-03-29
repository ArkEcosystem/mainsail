import { yellow } from "kleur/colors";

import { Console, describe } from "../../../test-framework/source";
import { Identifiers } from "../ioc/index.js";
import { Title } from "./title";
describe<{
	component: Title;
	cli: Console;
}>("Title", ({ beforeEach, it, assert, spy }) => {
	beforeEach((context) => {
		context.cli = new Console();
		context.cli.app.rebind(Identifiers.Title).to(Title).inSingletonScope();
		context.component = context.cli.app.get(Identifiers.Title);
	});

	it("should render the component", async ({ component, cli }) => {
		const spyOnLog = spy(cli.app.get(Identifiers.Logger), "log");

		await component.render("Hello World");

		spyOnLog.calledWith(yellow("Hello World"));
		spyOnLog.calledWith(yellow("==========="));
	});
});
