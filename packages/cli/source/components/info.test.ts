import { bgBlue, white } from "kleur/colors";
import { Identifiers } from "@mainsail/constants";

import { describe } from "@mainsail/test-runner";
import { Info } from "./info";
import { Console } from "../test/index.js";

describe<{
	component: Info;
	cli: Console;
}>("Info", ({ beforeEach, it, assert, spy }) => {
	beforeEach((context) => {
		context.cli = new Console();
		context.cli.app.rebind(Identifiers.Cli.Component.Info).to(Info).inSingletonScope();
		context.component = context.cli.app.get(Identifiers.Cli.Component.Info);
	});

	it("should render the component", async ({ component, cli }) => {
		const spyOnInfo = spy(cli.app.get(Identifiers.Cli.Service.Logger), "info");

		component.render("Hello World");

		spyOnInfo.calledWith(white(bgBlue(`[INFO] Hello World`)));
	});
});
