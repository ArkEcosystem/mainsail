import { blue, red } from "kleur";
import prompts from "prompts";

import { Console, describe } from "../../../core-test-framework";
import { Identifiers } from "../ioc";
import { SuggestCommand } from "./suggest";

describe<{
	cmd: SuggestCommand;
	cli: Console;
}>("SuggestCommand", ({ beforeEach, it, assert, spy }) => {
	beforeEach((context) => {
		context.cli = new Console();
		context.cmd = context.cli.app.resolve(SuggestCommand);
	});

	it("should immediately return if there is no signature", async ({ cmd }) => {
		await cmd.execute({ bin: "ark", signature: "", signatures: [] });
	});

	it("should immediately return if there are no signatures", async ({ cmd }) => {
		await cmd.execute({ bin: "ark", signature: "topic:command", signatures: [] });
	});

	it("should update the bin help if a topic is found", async ({ cli, cmd }) => {
		const spyWarning = spy(cli.app.get(Identifiers.Warning), "render");

		prompts.inject([true]);

		await cmd.execute({ bin: "ark", signature: "topic:command", signatures: ["topic:command1"] });

		spyWarning.calledWith(`${red("topic:command")} is not a ark command.`);
	});

	it("should throw if suggestion is not confirmed", async ({ cli, cmd }) => {
		const spyInfo = spy(cli.app.get(Identifiers.Info), "render");

		prompts.inject([false]);

		await cmd.execute({
			bin: "ark",
			signature: "topic:command",
			signatures: ["topic:command1"],
		});

		spyInfo.calledWith(`Run ${blue("ark help")} for a list of available commands.`);
	});
});
