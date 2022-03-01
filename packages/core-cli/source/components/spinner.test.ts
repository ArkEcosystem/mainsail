import { Console, describe } from "../../../core-test-framework";
import { Identifiers } from "../ioc";
import { Spinner } from "./spinner";

describe<{
	component: Spinner;
	cli: Console;
}>("Spinner", ({ beforeEach, it, assert, spy }) => {
	beforeEach((context) => {
		context.cli = new Console();
		context.cli.app.rebind(Identifiers.Spinner).to(Spinner).inSingletonScope();
		context.component = context.cli.app.get(Identifiers.Spinner);
	});

	it("should render the component", async ({ component, cli }) => {
		assert.object(component.render("Hello World"));
	});
});
