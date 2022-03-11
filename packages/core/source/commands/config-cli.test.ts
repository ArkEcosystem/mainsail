import { Container, Contracts } from "@arkecosystem/core-cli";
import { Console, describe } from "@arkecosystem/core-test-framework";
import execa from "execa";

import { Command } from "./config-cli";

describe<{
	cli: Console;
	config: Contracts.Config;
}>("ConfigCliCommand", ({ beforeEach, it, assert, stub }) => {
	beforeEach((context) => {
		context.cli = new Console();
		context.config = context.cli.app.get<Contracts.Config>(Container.Identifiers.Config);
	});

	it("should change the token", async ({ cli, config }) => {
		await cli.execute(Command);

		assert.equal(config.get("token"), "ark");

		await cli.withFlags({ token: "btc" }).execute(Command);

		assert.equal(config.get("token"), "btc");
	});

	it("should not set config token if no token is passed to command", async ({ config }) => {
		const cli = new Console(false);
		stub(cli.app.get(Container.Identifiers.Environment), "getPaths");
		const spySetToken = stub(config, "set");

		await assert.resolves(() => cli.execute(Command));

		spySetToken.neverCalled();
	});

	it("should change the channel and install the new version", async ({ cli, config }) => {
		stub(execa, "sync").returnValue({
			exitCode: 0,
			stderr: undefined,
			stdout: '"null"',
		});
		const install = stub(cli.app.get(Container.Identifiers.Installer), "install");

		await cli.withFlags({ channel: "latest" }).execute(Command);

		assert.equal(config.get("channel"), "latest");
		install.calledWith("@arkecosystem/core", "latest");

		await cli.withFlags({ channel: "next" }).execute(Command);

		assert.equal(config.get("channel"), "next");
		install.calledWith("@arkecosystem/core", "next");

		await cli.withFlags({ channel: "latest" }).execute(Command);

		assert.equal(config.get("channel"), "latest");
		install.calledWith("@arkecosystem/core", "latest");
	});

	it("should fail to change the channel if the new and old are the same", async ({ cli, config }) => {
		config.set("channel", "latest");

		await assert.rejects(
			() => cli.withFlags({ channel: "latest" }).execute(Command),
			'You are already on the "latest" channel.',
		);
	});
});
