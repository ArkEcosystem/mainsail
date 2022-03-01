import { yellow } from "kleur";

import { Console, describe } from "../../../core-test-framework";
import { Identifiers } from "../ioc";
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
