import { Console } from "@mainsail/cli";
import { describe } from "@mainsail/test-runner";
import { Services } from "@mainsail/cli";
import { Identifiers } from "@mainsail/constants";

import { Command } from "./plugin-update";

describe<{
	cli: Console;
	pluginManager: Services.PluginManager;
}>("PluginUpdateCommand", ({ beforeEach, it, assert, stub }) => {
	const packageName = "dummyPackageName";

	beforeEach((context) => {
		context.cli = new Console();

		context.pluginManager = context.cli.app.get(Identifiers.Cli.Service.PluginManager);
	});

	it("should throw when package name is not provided", async ({ pluginManager, cli }) => {
		const spyOnUpdate = stub(pluginManager, "update");

		await assert.rejects(() => cli.execute(Command), `"package" is required`);

		spyOnUpdate.neverCalled();
	});

	it("should call update", async ({ cli, pluginManager }) => {
		const spyOnUpdate = stub(pluginManager, "update");

		await assert.resolves(() => cli.withArgs([packageName]).execute(Command));

		spyOnUpdate.calledWith(packageName);
	});
});
