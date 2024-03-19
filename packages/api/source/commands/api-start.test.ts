import { Identifiers, Services } from "@mainsail/cli";
import { dirSync, setGracefulCleanup } from "tmp";

import { Console, describe } from "../../../test-framework/source";
import { Command } from "./api-start";

describe<{
	cli: Console;
	processManager: Services.ProcessManager;
}>("ApiStartCommand", ({ beforeEach, afterAll, it, assert, stub, match }) => {
	beforeEach((context) => {
		process.env.CORE_PATH_CONFIG = dirSync().name;

		context.cli = new Console();
		context.processManager = context.cli.app.get(Identifiers.ProcessManager);
	});

	afterAll(() => setGracefulCleanup());

	it("should throw if the process does not exist", async ({ processManager, cli }) => {
		const spyStart = stub(processManager, "start");

		await cli.execute(Command);

		spyStart.calledWith(
			{
				args: "api:run --network='testnet' --token='ark' --v=0 --env='production' --skipPrompts=false",
				env: {
					CORE_ENV: "production",
					NODE_ENV: "production",
				},
				name: "mainsail-api",
				node_args: undefined,
				script: match.string,
			},
			{ "kill-timeout": 30_000, "max-restarts": 5, name: "mainsail-api" },
		);
	});
});
