import { Console, describe } from "../../../test-framework/source";
import { Identifiers } from "../ioc/index.js";
import { Log } from "./log";

describe<{
	component: Log;
	cli: Console;
}>("Log", ({ beforeEach, it, assert, spy }) => {
	beforeEach((context) => {
		context.cli = new Console();
		context.cli.app.rebind(Identifiers.Log).to(Log).inSingletonScope();
		context.component = context.cli.app.get(Identifiers.Log);
	});

	it("should render the component", async ({ component, cli }) => {
		const spyOnLog = spy(cli.app.get(Identifiers.Logger), "log");

		component.render("Hello World");

		spyOnLog.calledWith("Hello World");
	});
});
