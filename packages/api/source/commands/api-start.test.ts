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

	// DaemonizeProcess adds node_args {max_old_space_size} to the start options on machines
	// with < 2 GB RAM; strip it from the recorded call so the assertions are platform-independent.
	const stripNodeArguments = (spyStart: any) => delete spyStart.getCallArgs(0)[0].node_args;

	it("should start the API process", async ({ processManager, cli }) => {
		const spyStart = stub(processManager, "start");

		await cli.execute(Command);

		stripNodeArguments(spyStart);
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
		stripNodeArguments(spyStart);
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

	it("should start the process without daemonizing when the [--daemon] flag is false", async ({
		processManager,
		cli,
	}) => {
		const spyStart = stub(processManager, "start");

		await cli.withFlags({ daemon: false }).execute(Command);

		// The daemon flag is stripped from the args string but toggles "no-daemon" on the process options.
		stripNodeArguments(spyStart);
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
			{ "kill-timeout": 30_000, "max-restarts": 5, "no-daemon": true, name: "mainsail-api" },
		);
	});

	it("should daemonize the process when the [--daemon] flag is true", async ({ processManager, cli }) => {
		const spyStart = stub(processManager, "start");

		await cli.withFlags({ daemon: true }).execute(Command);

		// daemon=true is the default, so the process options must NOT carry the "no-daemon" flag.
		stripNodeArguments(spyStart);
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

	it("should pass the [--env] and [--skipPrompts] flags through to the process", async ({ processManager, cli }) => {
		const spyStart = stub(processManager, "start");

		await cli.withFlags({ env: "test", skipPrompts: true }).execute(Command);

		// The order flags appear in the args string is not stable across overrides, so assert the
		// meaningful parts: env propagates to MAINSAIL_ENV and both flags reach the api:run args.
		const [options] = spyStart.getCallArgs(0);
		assert.equal(options.env.MAINSAIL_ENV, "test");
		assert.true(options.args.includes("--env='test'"));
		// A boolean true flag is rendered as a bare "--skipPrompts" (no "=true"); explicitly reject
		// the default "=false" rendering so a dropped flag cannot satisfy this assertion.
		assert.true(options.args.includes("--skipPrompts"));
		assert.false(options.args.includes("--skipPrompts=false"));
	});
});
