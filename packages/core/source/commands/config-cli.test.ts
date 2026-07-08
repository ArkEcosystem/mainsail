import type { Contracts } from "@mainsail/contracts";
import { BuildPackages, Identifiers } from "@mainsail/constants";
import { Console } from "@mainsail/cli";

import { describe } from "@mainsail/test-runner";
import { Command } from "./config-cli";

describe<{
	cli: Console;
	config: Contracts.Cli.Config;
}>("ConfigCliCommand", ({ beforeEach, it, assert, stub }) => {
	beforeEach((context) => {
		context.cli = new Console();
		context.config = context.cli.app.get<Contracts.Cli.Config>(Identifiers.Cli.Service.Config);
	});

	it("should not update the config if the [--channel] flag is not present", async () => {
		const cli = new Console(false);
		stub(cli.app.get(Identifiers.Cli.Service.Environment), "getPaths");
		const spySet = stub(cli.app.get<Contracts.Cli.Config>(Identifiers.Cli.Service.Config), "set");

		await assert.resolves(() => cli.execute(Command));

		spySet.neverCalled();
	});

	it("should change the channel and install the new version", async ({ cli, config }) => {
		// Keep channel changes in memory instead of persisting them to the user's config file.
		stub(config, "save");
		config.set("channel", "latest");

		const install = stub(cli.app.get(Identifiers.Cli.Service.Installer), "install");
		stub(cli.app.get(Identifiers.Cli.Service.ProcessManager), "isOnline").returnValue(false);

		await cli.withFlags({ channel: "next" }).execute(Command);

		assert.equal(config.get("channel"), "next");
		install.calledWith("@mainsail/core", BuildPackages, "next");

		// And back again.
		await cli.withFlags({ channel: "latest" }).execute(Command);

		assert.equal(config.get("channel"), "latest");
		install.calledWith("@mainsail/core", BuildPackages, "latest");
	});

	it("should fail to change the channel if the new and old are the same", async ({ cli, config }) => {
		stub(config, "save");
		config.set("channel", "latest");

		await assert.rejects(
			() => cli.withFlags({ channel: "latest" }).execute(Command),
			'You are already on the "latest" channel.',
		);
	});
});
