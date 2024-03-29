import { bgRed, white } from "kleur/colors";

import { Console, describe } from "../../../test-framework/source";
import { Identifiers } from "../ioc/index.js";
import { Error } from "./error";

describe<{
	component: Error;
	cli: Console;
}>("Error", ({ beforeEach, it, assert, spy }) => {
	beforeEach((context) => {
		context.cli = new Console();
		context.cli.app.rebind(Identifiers.Error).to(Error).inSingletonScope();
		context.component = context.cli.app.get(Identifiers.Error);
	});

	it("should render the component", async ({ component, cli }) => {
		const spyOnError = spy(cli.app.get(Identifiers.Logger), "error");

		component.render("Hello World");

		spyOnError.calledWith(white(bgRed(`[ERROR] Hello World`)));
	});
});
