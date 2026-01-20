import { Console, describe } from "../../../test-framework/source";
import { Identifiers } from "@mainsail/constants";
import { Spinner } from "./spinner";

describe<{
	component: Spinner;
	cli: Console;
}>("Spinner", ({ beforeEach, it, assert, spy }) => {
	beforeEach((context) => {
		context.cli = new Console();
		context.cli.app.rebind(Identifiers.Cli.Component.Spinner).to(Spinner).inSingletonScope();
		context.component = context.cli.app.get(Identifiers.Cli.Component.Spinner);
	});

	it("should render the component", async ({ component, cli }) => {
		assert.object(component.render("Hello World"));
	});
});
