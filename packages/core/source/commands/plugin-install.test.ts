import { Identifiers, Services } from "@mainsail/cli";
import { Console, describe } from "@mainsail/test-framework";

import { Command } from "./plugin-install";

describe<{
	cli: Console;
	pluginManager: Services.PluginManager;
}>("PluginInstallCommand", ({ beforeEach, it, assert, stub }) => {
	const packageName = "dummyPackageName";

	beforeEach((context) => {
		process.argv = ["", "test"];

		context.cli = new Console();
		context.pluginManager = context.cli.app.get(Identifiers.PluginManager);
	});

	it("should throw an error when package name is not provided", async ({ cli, pluginManager }) => {
		const spyOnInstall = stub(pluginManager, "install");

		await assert.rejects(() => cli.execute(Command), `"package" is required`);

		spyOnInstall.neverCalled();
	});

	it("should call install", async ({ cli, pluginManager }) => {
		const spyOnInstall = stub(pluginManager, "install");

		const version = "3.0.0";
		await assert.resolves(() => cli.withArgs([packageName]).withFlags({ version }).execute(Command));

		spyOnInstall.calledWith(packageName, version);
	});
});
