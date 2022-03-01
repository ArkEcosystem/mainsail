import { Console, describe } from "../../../core-test-framework";
import { Identifiers } from "../ioc";
import { Listing } from "./listing";

describe<{
	component: Listing;
	cli: Console;
}>("Listing", ({ beforeEach, it, assert, spy }) => {
	beforeEach((context) => {
		context.cli = new Console();
		context.cli.app.rebind(Identifiers.Listing).to(Listing).inSingletonScope();
		context.component = context.cli.app.get(Identifiers.Listing);
	});

	it("should render the component", async ({ component, cli }) => {
		const spyOnLog = spy(cli.app.get(Identifiers.Logger), "log");

		await component.render(["1", "2", "3"]);

		spyOnLog.calledTimes(3);
		spyOnLog.calledWith(" * 1");
		spyOnLog.calledWith(" * 2");
		spyOnLog.calledWith(" * 3");
	});
});
