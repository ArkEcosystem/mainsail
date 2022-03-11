import { describe } from "@arkecosystem/core-test-framework";
import { Commands, Services } from "@arkecosystem/core-cli";
import { CommandLineInterface } from "./cli";
import envPaths from "env-paths";
import prompts from "prompts";
import { join } from "path";

describe("CLI", ({ beforeEach, it, assert, stub }) => {
	beforeEach(() => {
		process.exitCode = undefined;
		stub(Services.Updater.prototype, "check");
	});

	it("should run successfully using valid commands", async () => {
		const cli = new CommandLineInterface(["help"]);
		await assert.resolves(() => cli.execute("distribution"));
	});

	it("should fail when the dirname isn't properly configured", async () => {
		const cli = new CommandLineInterface(["help"]);
		// default dirname runs from a specific relative file location
		await assert.rejects(() => cli.execute());
	});

	it("should set exitCode = 2 when using invalid commands", async () => {
		let message: string;
		stub(console, "warn").callsFake((m: string) => (message = m));

		const cli = new CommandLineInterface(["hello"]);
		prompts.inject([false]);

		await cli.execute("distribution");

		assert.true(message.includes(`is not a ark command.`));
		assert.equal(process.exitCode, 2);
	});

	it("should set exitCode = 2 when the command doesn't have a valid signature", async () => {
		const cli = new CommandLineInterface(["--nope"]);
		await cli.execute("distribution");

		assert.equal(process.exitCode, 2);
	});

	it("should not set exitCode when a valid command appears with the help flag", async () => {
		const cli = new CommandLineInterface(["update", "--help"]);

		await assert.resolves(() => cli.execute("distribution"));
		assert.undefined(process.exitCode);
	});

	it("should execute a suggested command", async () => {
		const mockExit = stub(process, "exit");

		const cli = new CommandLineInterface(["hello"]);
		prompts.inject([true]);

		await assert.resolves(() => cli.execute("distribution"));

		mockExit.neverCalled();
	});

	it("should load CLI plugins from folder using provided token and network", async () => {
		const spyOnList = stub(Services.PluginManager.prototype, "list").resolvedValue([
			{
				path: "test/path",
			},
		]);
		const spyOnFrom = stub(Commands.DiscoverCommands.prototype, "from").returnValueOnce({ plugin: {} });
		const token = "dummy";
		const network = "testnet";

		const cli = new CommandLineInterface(["help", `--token=${token}`, `--network=${network}`]);

		await assert.resolves(() => cli.execute("distribution"));
		spyOnList.calledWith(token, network);
		spyOnFrom.calledOnce();
	});

	it("should load CLI plugins from folder using CORE_PATH_CONFIG", async () => {
		const spyOnList = stub(Services.PluginManager.prototype, "list").resolvedValue([]);
		process.env.CORE_PATH_CONFIG = join(__dirname, "../test/config");

		const cli = new CommandLineInterface(["help"]);

		await assert.resolves(() => cli.execute("distribution"));

		spyOnList.calledWith("dummyToken", "testnet");
		delete process.env.CORE_PATH_CONFIG;
	});

	it("should load CLI plugins from folder using detected network folder", async () => {
		const spyOnList = stub(Services.PluginManager.prototype, "list").resolvedValue([]);
		const spyOnDiscoverNetwork = stub(Commands.DiscoverNetwork.prototype, "discover").resolvedValue("testnet");

		const cli = new CommandLineInterface(["help"]);

		await assert.resolves(() => cli.execute("distribution"));
		spyOnList.calledWith("ark", "testnet");
		spyOnDiscoverNetwork.calledWith(envPaths("ark", { suffix: "core" }).config);
	});

	it("should not load CLI plugins if network is not provided", async () => {
		const spyOnList = stub(Services.PluginManager.prototype, "list").resolvedValue([]);
		const token = "dummy";

		const cli = new CommandLineInterface(["help", `--token=${token}`]);

		await assert.resolves(() => cli.execute("distribution"));
		spyOnList.neverCalled();
	});
});
