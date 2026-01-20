import { Console, describe } from "../../../test-framework/source";
import { Identifiers } from "@mainsail/constants";
import { Listing } from "./listing";

describe<{
	component: Listing;
	cli: Console;
}>("Listing", ({ beforeEach, it, assert, spy }) => {
	beforeEach((context) => {
		context.cli = new Console();
		context.cli.app.rebind(Identifiers.Cli.Component.Listing).to(Listing).inSingletonScope();
		context.component = context.cli.app.get(Identifiers.Cli.Component.Listing);
	});

	it("should render the component", async ({ component, cli }) => {
		const spyOnLog = spy(cli.app.get(Identifiers.Cli.Service.Logger), "log");
		await component.render(["1", "2", "3"]);

		spyOnLog.calledTimes(3);
		spyOnLog.calledWith(" * 1");
		spyOnLog.calledWith(" * 2");
		spyOnLog.calledWith(" * 3");
	});
});
