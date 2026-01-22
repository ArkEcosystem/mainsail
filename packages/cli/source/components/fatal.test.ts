import { bgRed, white } from "kleur/colors";
import { Identifiers } from "@mainsail/constants";

import { describe } from "@mainsail/test-runner";
import { Fatal } from "./fatal";
import { Console } from "../test/index.js";

describe<{
	component: Fatal;
	cli: Console;
}>("Fatal", ({ beforeEach, it, assert, spy }) => {
	beforeEach((context) => {
		context.cli = new Console();
		context.cli.app.rebind(Identifiers.Cli.Component.Fatal).to(Fatal).inSingletonScope();
		context.component = context.cli.app.get(Identifiers.Cli.Component.Fatal);
	});

	it("should render the component", async ({ component, cli }) => {
		const spyOnError = spy(cli.app.get(Identifiers.Cli.Service.Logger), "error");

		assert.throws(() => component.render("Hello World"), "Hello World");

		spyOnError.calledWith(white(bgRed(`[ERROR] Hello World`)));
	});
});
