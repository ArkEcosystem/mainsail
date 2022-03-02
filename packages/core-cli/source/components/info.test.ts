import { white } from "kleur";

import { Console, describe } from "../../../core-test-framework";
import { Identifiers } from "../ioc";
import { Info } from "./info";

describe<{
	component: Info;
	cli: Console;
}>("Info", ({ beforeEach, it, assert, spy }) => {
	beforeEach((context) => {
		context.cli = new Console();
		context.cli.app.rebind(Identifiers.Info).to(Info).inSingletonScope();
		context.component = context.cli.app.get(Identifiers.Info);
	});

	it("should render the component", async ({ component, cli }) => {
		const spyOnInfo = spy(cli.app.get(Identifiers.Logger), "info");

		component.render("Hello World");

		spyOnInfo.calledWith(white().bgBlue(`[INFO] Hello World`));
	});
});
