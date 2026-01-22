import { bgYellow, white } from "kleur/colors";

import { describe } from "@mainsail/test-runner";
import { Identifiers } from "@mainsail/constants";
import { Warning } from "./warning";
import { Console } from "../test/index.js";

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
