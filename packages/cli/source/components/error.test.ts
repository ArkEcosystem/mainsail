import { bgRed, white } from "kleur/colors";
import { Identifiers } from "@mainsail/constants";

import { Console, describe } from "../../../test-framework/source";
import { Error } from "./error";

describe<{
	component: Error;
	cli: Console;
}>("Error", ({ beforeEach, it, assert, spy }) => {
	beforeEach((context) => {
		context.cli = new Console();
		context.cli.app.rebind(Identifiers.Cli.Component.Error).to(Error).inSingletonScope();
		context.component = context.cli.app.get(Identifiers.Cli.Component.Error);
	});

	it("should render the component", async ({ component, cli }) => {
		const spyOnError = spy(cli.app.get(Identifiers.Cli.Service.Logger), "error");

		component.render("Hello World");

		spyOnError.calledWith(white(bgRed(`[ERROR] Hello World`)));
	});
});
