import { Contracts, Identifiers } from "@mainsail/cli";
import { Console, describe } from "@mainsail/test-framework";
import execa from "execa";

import { Command } from "./config-cli";

describe<{
	cli: Console;
	config: Contracts.Config;
}>("ConfigCliCommand", ({ beforeEach, it, assert, stub }) => {
	beforeEach((context) => {
		context.cli = new Console();
		context.config = context.cli.app.get<Contracts.Config>(Identifiers.Config);
	});

	it("should change the channel and install the new version", async ({ cli, config }) => {
		stub(execa, "sync").returnValue({
			exitCode: 0,
			stderr: undefined,
			stdout: '"null"',
		});
		const install = stub(cli.app.get(Identifiers.Installer), "install");

		await cli.withFlags({ channel: "latest" }).execute(Command);

		assert.equal(config.get("channel"), "latest");
		install.calledWith("@mainsail/core", "latest");

		await cli.withFlags({ channel: "next" }).execute(Command);

		assert.equal(config.get("channel"), "next");
		install.calledWith("@mainsail/core", "next");

		await cli.withFlags({ channel: "latest" }).execute(Command);

		assert.equal(config.get("channel"), "latest");
		install.calledWith("@mainsail/core", "latest");
	});

	it("should fail to change the channel if the new and old are the same", async ({ cli, config }) => {
		config.set("channel", "latest");

		await assert.rejects(
			() => cli.withFlags({ channel: "latest" }).execute(Command),
			'You are already on the "latest" channel.',
		);
	});
});
