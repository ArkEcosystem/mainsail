import { bgGreen, white } from "kleur/colors";

import { Console, describe } from "../../../test-framework/source";
import { Identifiers } from "../ioc/index.js";
import { Success } from "./success";

describe<{
	component: Success;
	cli: Console;
}>("Success", ({ beforeEach, it, assert, spy }) => {
	beforeEach((context) => {
		context.cli = new Console();
		context.cli.app.rebind(Identifiers.Success).to(Success).inSingletonScope();
		context.component = context.cli.app.get(Identifiers.Success);
	});

	it("should render the component", async ({ component, cli }) => {
		const spyOnLog = spy(cli.app.get(Identifiers.Logger), "log");

		component.render("Hello World");

		spyOnLog.calledWith(white(bgGreen(`[OK] Hello World`)));
	});
});
