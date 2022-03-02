import { Console, describe } from "../../../core-test-framework";
import { Identifiers } from "../ioc";
import { NewLine } from "./new-line";

describe<{
	component: NewLine;
	cli: Console;
}>("NewLine", ({ beforeEach, it, assert, spy }) => {
	beforeEach((context) => {
		context.cli = new Console();
		context.cli.app.rebind(Identifiers.NewLine).to(NewLine).inSingletonScope();
		context.component = context.cli.app.get(Identifiers.NewLine);
	});

	it("should render the component", async ({ component, cli }) => {
		const spyOnLog = spy(cli.app.get(Identifiers.Logger), "log");

		component.render();

		spyOnLog.calledWith("\n");
	});
});
