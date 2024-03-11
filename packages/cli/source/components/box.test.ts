import { Console, describe } from "../../../test-framework";
import { Identifiers } from "../ioc/index.js";
import { Box } from "./box";

describe<{
	component: Box;
	cli: Console;
}>("Box", ({ beforeEach, it, assert, spy }) => {
	beforeEach((context) => {
		context.cli = new Console();
		context.cli.app.rebind(Identifiers.Box).to(Box).inSingletonScope();
		context.component = context.cli.app.get(Identifiers.Box);
	});

	it("should render the component", async ({ component, cli }) => {
		const spyOnLog = spy(cli.app.get(Identifiers.Logger), "log");

		component.render("Hello World");

		spyOnLog.calledOnce();
	});
});
