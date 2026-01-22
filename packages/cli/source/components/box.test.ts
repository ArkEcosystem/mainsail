import { describe } from "@mainsail/test-runner";
import { Identifiers } from "@mainsail/constants";
import { Box } from "./box";
import { Console } from "../test/index.js";

describe<{
	component: Box;
	cli: Console;
}>("Box", ({ beforeEach, it, assert, spy }) => {
	beforeEach((context) => {
		context.cli = new Console();
		context.cli.app.rebind(Identifiers.Cli.Component.Box).to(Box).inSingletonScope();
		context.component = context.cli.app.get(Identifiers.Cli.Component.Box);
	});

	it("should render the component", async ({ component, cli }) => {
		const spyOnLog = spy(cli.app.get(Identifiers.Cli.Service.Logger), "log");

		component.render("Hello World");

		spyOnLog.calledOnce();
	});
});
