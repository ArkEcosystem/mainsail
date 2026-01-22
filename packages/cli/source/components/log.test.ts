import { describe } from "@mainsail/test-runner";
import { Identifiers } from "@mainsail/constants";
import { Log } from "./log";
import { Console } from "../test/index.js";

describe<{
	component: Log;
	cli: Console;
}>("Log", ({ beforeEach, it, assert, spy }) => {
	beforeEach((context) => {
		context.cli = new Console();
		context.cli.app.rebind(Identifiers.Cli.Component.Log).to(Log).inSingletonScope();
		context.component = context.cli.app.get(Identifiers.Cli.Component.Log);
	});

	it("should render the component", async ({ component, cli }) => {
		const spyOnLog = spy(cli.app.get(Identifiers.Cli.Service.Logger), "log");

		component.render("Hello World");

		spyOnLog.calledWith("Hello World");
	});
});
