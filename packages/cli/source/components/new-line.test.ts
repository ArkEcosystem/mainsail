import { Console, describe } from "../../../test-framework/source";
import { Identifiers } from "@mainsail/constants";
import { NewLine } from "./new-line";

describe<{
	component: NewLine;
	cli: Console;
}>("NewLine", ({ beforeEach, it, assert, spy }) => {
	beforeEach((context) => {
		context.cli = new Console();
		context.cli.app.rebind(Identifiers.Cli.Component.NewLine).to(NewLine).inSingletonScope();
		context.component = context.cli.app.get(Identifiers.Cli.Component.NewLine);
	});

	it("should render the component", async ({ component, cli }) => {
		const spyOnLog = spy(cli.app.get(Identifiers.Cli.Service.Logger), "log");

		component.render();

		spyOnLog.calledWith("\n");
	});
});
