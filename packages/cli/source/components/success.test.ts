import { bgGreen, white } from "kleur/colors";

import { Console, describe } from "@mainsail/test-framework";
import { Identifiers } from "@mainsail/constants";
import { Success } from "./success";

describe<{
	component: Success;
	cli: Console;
}>("Success", ({ beforeEach, it, assert, spy }) => {
	beforeEach((context) => {
		context.cli = new Console();
		context.cli.app.rebind(Identifiers.Cli.Component.Success).to(Success).inSingletonScope();
		context.component = context.cli.app.get(Identifiers.Cli.Component.Success);
	});

	it("should render the component", async ({ component, cli }) => {
		const spyOnLog = spy(cli.app.get(Identifiers.Cli.Service.Logger), "log");

		component.render("Hello World");

		spyOnLog.calledWith(white(bgGreen(`[OK] Hello World`)));
	});
});
