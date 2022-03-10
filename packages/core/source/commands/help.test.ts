import { Container } from "@arkecosystem/core-cli";
import { Console, describe } from "@arkecosystem/core-test-framework";

import { Command } from "./help";

describe<{
	cli: Console;
}>("HelpCommand", ({ beforeEach, it, stub, assert }) => {
	beforeEach((context) => {
		context.cli = new Console();
	});

	it("should render a table with process information", async ({ cli }) => {
		let message: string;
		stub(console, "log").callsFake((m) => (message = m));

		const mockCommands = {
			command1: { description: "test" },
			command2: { description: "another test" },
			"grouped:again": { description: "I'm also grouped" },
			"grouped:anotherkey": { description: "I should be grouped" },
		};

		cli.app.bind(Container.Identifiers.Commands).toConstantValue(mockCommands);

		await cli.execute(Command);

		assert.true(
			[
				...Object.keys(mockCommands),
				...Object.values(mockCommands).map((value) => value.description),
				"grouped",
				"default",
				"Usage",
				"Flags",
				"Available Commands",
			].every((value) => message.includes(value)),
		);
	});
});
