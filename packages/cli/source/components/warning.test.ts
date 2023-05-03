import { white } from "kleur";

import { Console, describe } from "../../../core-test-framework";
import { Identifiers } from "../ioc";
import { Warning } from "./warning";

describe<{
	component: Warning;
	cli: Console;
}>("Warning", ({ beforeEach, it, assert, spy }) => {
	beforeEach((context) => {
		context.cli = new Console();
		context.cli.app.rebind(Identifiers.Warning).to(Warning).inSingletonScope();
		context.component = context.cli.app.get(Identifiers.Warning);
	});

	it("should render the component", async ({ component, cli }) => {
		const spyOnLog = spy(cli.app.get(Identifiers.Logger), "warning");

		component.render("Hello World");

		spyOnLog.calledWith(white().bgYellow(`[WARNING] Hello World`));
	});
});
