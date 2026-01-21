import { bgYellow, white } from "kleur/colors";

import { Console, describe } from "@mainsail/test-framework";
import { Identifiers } from "@mainsail/constants";
import { Warning } from "./warning";

describe<{
	component: Warning;
	cli: Console;
}>("Warning", ({ beforeEach, it, assert, spy }) => {
	beforeEach((context) => {
		context.cli = new Console();
		context.cli.app.rebind(Identifiers.Cli.Component.Warning).to(Warning).inSingletonScope();
		context.component = context.cli.app.get(Identifiers.Cli.Component.Warning);
	});

	it("should render the component", async ({ component, cli }) => {
		const spyOnLog = spy(cli.app.get(Identifiers.Cli.Service.Logger), "warn");

		component.render("Hello World");

		spyOnLog.calledWith(white(bgYellow(`[WARNING] Hello World`)));
	});
});
