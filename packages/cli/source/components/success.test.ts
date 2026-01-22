import { bgGreen, white } from "kleur/colors";

import { describe } from "@mainsail/test-runner";
import { Identifiers } from "@mainsail/constants";
import { Success } from "./success";
import { Console } from "../test/index.js";

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
