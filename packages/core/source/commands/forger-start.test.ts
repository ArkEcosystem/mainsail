import { Container, Services } from "@arkecosystem/core-cli";
import { Console, describe } from "@arkecosystem/core-test-framework";
import { writeJSONSync } from "fs-extra";
import { resolve } from "path";
import { dirSync, setGracefulCleanup } from "tmp";

import { Command } from "./forger-start";

describe<{
	cli: Console;
	processManager: Services.ProcessManager;
}>("ForgerStartCommand", ({ beforeEach, afterAll, it, stub }) => {
	beforeEach((context) => {
		process.env.CORE_PATH_CONFIG = dirSync().name;

		writeJSONSync(`${process.env.CORE_PATH_CONFIG}/delegates.json`, { secrets: ["bip39"] });

		context.cli = new Console();
		context.processManager = context.cli.app.get(Container.Identifiers.ProcessManager);
	});

	afterAll(() => setGracefulCleanup());

	it("should throw if the process does not exist", async ({ processManager, cli }) => {
		const spyStart = stub(processManager, "start");

		await cli.execute(Command);

		spyStart.calledWith(
			{
				args: "forger:run --network='testnet' --token='ark' --v=0 --env='production' --skipPrompts=false",
				env: {
					CORE_ENV: "production",
					NODE_ENV: "production",
				},
				name: "ark-forger",
				node_args: undefined,
				script: resolve(__dirname, "../../../../packages/core/bin/run"),
			},
			{ "kill-timeout": 30_000, "max-restarts": 5, name: "ark-forger" },
		);
	});
});
