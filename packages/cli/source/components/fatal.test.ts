import { bgRed, white } from "kleur/colors";

import { Console, describe } from "../../../test-framework/source";
import { Identifiers } from "../ioc/index.js";
import { Fatal } from "./fatal";

describe<{
	component: Fatal;
	cli: Console;
}>("Fatal", ({ beforeEach, it, assert, spy }) => {
	beforeEach((context) => {
		context.cli = new Console();
		context.cli.app.rebind(Identifiers.Fatal).to(Fatal).inSingletonScope();
		context.component = context.cli.app.get(Identifiers.Fatal);
	});

	it("should render the component", async ({ component, cli }) => {
		const spyOnError = spy(cli.app.get(Identifiers.Logger), "error");

		assert.throws(() => component.render("Hello World"), "Hello World");

		spyOnError.calledWith(white(bgRed(`[ERROR] Hello World`)));
	});
});
