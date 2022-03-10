import { Container, Services } from "@arkecosystem/core-cli";
import { Command } from "./relay-start";
import { Console, describe } from "@arkecosystem/core-test-framework";
import { resolve } from "path";

describe<{
	cli: Console;
	processManager: Services.ProcessManager;
}>("RelayStartCommand", ({ beforeEach, it, assert, stub }) => {
	beforeEach((context) => {
		context.cli = new Console();
		context.processManager = context.cli.app.get(Container.Identifiers.ProcessManager);
	});

	it("should throw if the process does not exist", async ({ cli, processManager }) => {
		const spyStart = stub(processManager, "start");

		await cli.execute(Command);

		spyStart.calledWith(
			{
				args: "relay:run --network='testnet' --token='ark' --v=0 --env='production'",
				env: {
					CORE_ENV: "production",
					NODE_ENV: "production",
				},
				name: "ark-relay",
				node_args: undefined,
				script: resolve(__dirname, "../../../../packages/core/bin/run"),
			},
			{ "kill-timeout": 30_000, "max-restarts": 5, name: "ark-relay" },
		);
	});
});
