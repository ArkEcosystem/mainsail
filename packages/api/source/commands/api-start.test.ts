import { Services, Console } from "@mainsail/cli";
import { Identifiers } from "@mainsail/constants";
import { dirSync, setGracefulCleanup } from "tmp";
import { describe } from "@mainsail/test-runner";
import { Command } from "./api-start";

describe<{
	cli: Console;
	processManager: Services.ProcessManager;
}>("ApiStartCommand", ({ beforeEach, afterAll, it, assert, stub, match }) => {
	beforeEach((context) => {
		process.env.MAINSAIL_PATH_CONFIG = dirSync().name;

		context.cli = new Console();
		context.processManager = context.cli.app.get(Identifiers.Cli.Service.ProcessManager);
	});

	afterAll(() => setGracefulCleanup());

	it("should start the API process", async ({ processManager, cli }) => {
		const spyStart = stub(processManager, "start");

		await cli.execute(Command);

		spyStart.calledWith(
			{
				args: "api:run --network='devnet' --token='ark' --v=0 --env='production' --skipPrompts=false",
				env: {
					MAINSAIL_ENV: "production",
					NODE_ENV: "production",
				},
				name: "mainsail-api",
				script: match.string,
			},
			{ "kill-timeout": 30_000, "max-restarts": 5, name: "mainsail-api" },
		);
	});

	it("should start the process from the global entrypoint when installed globally", async ({
		processManager,
		cli,
	}) => {
		const setup = cli.app.get<Services.Setup>(Identifiers.Cli.Service.Setup);
		stub(setup, "isGlobal").returnValue(true);
		const getGlobalEntrypoint = stub(setup, "getGlobalEntrypoint").returnValue("/global/mainsail-api/run.js");
		const spyStart = stub(processManager, "start");

		await cli.execute(Command);

		getGlobalEntrypoint.calledWith("@mainsail/api");
		spyStart.calledWith(
			{
				args: "api:run --network='devnet' --token='ark' --v=0 --env='production' --skipPrompts=false",
				env: {
					MAINSAIL_ENV: "production",
					NODE_ENV: "production",
				},
				name: "mainsail-api",
				script: "/global/mainsail-api/run.js",
			},
			{ "kill-timeout": 30_000, "max-restarts": 5, name: "mainsail-api" },
		);
	});
});
