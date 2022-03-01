import { Console, describe } from "../../../core-test-framework";
import { Identifiers } from "../ioc";
import { Table } from "./table";

describe<{
	component: Table;
	cli: Console;
}>("Table", ({ beforeEach, it, assert, stub }) => {
	beforeEach((context) => {
		context.cli = new Console();
		context.cli.app.rebind(Identifiers.Table).to(Table).inSingletonScope();
		context.component = context.cli.app.get(Identifiers.Table);
	});

	it("should render the component", async ({ component, cli }) => {
		let message: string;
		const spyOnLog = stub(console, "log").callsFake((m) => (message = m));

		component.render(["ID", "Name"], (table) => {
			table.push([1, "John Doe"], [2, "Jane Doe"]);
		});

		assert.true(message.includes("ID"));
		assert.true(message.includes("Name"));
		assert.true(message.includes("1"));
		assert.true(message.includes("John Doe"));
		assert.true(message.includes("2"));
	});
});
