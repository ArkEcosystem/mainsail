import { Container, Services } from "@arkecosystem/core-cli";
import { Console, describe } from "@arkecosystem/core-test-framework";

import { Command } from "./plugin-update";

describe<{
	cli: Console;
	pluginManager: Services.PluginManager;
}>("PluginUpdateCommand", ({ beforeEach, it, assert, stub }) => {
	const packageName = "dummyPackageName";
	const token = "ark";
	const network = "testnet";

	beforeEach((context) => {
		context.cli = new Console();

		context.pluginManager = context.cli.app.get(Container.Identifiers.PluginManager);
	});

	it("should throw when package name is not provided", async ({ pluginManager, cli }) => {
		const spyOnUpdate = stub(pluginManager, "update");

		await assert.rejects(() => cli.execute(Command), `"package" is required`);

		spyOnUpdate.neverCalled();
	});

	it("should call update", async ({ cli, pluginManager }) => {
		const spyOnUpdate = stub(pluginManager, "update");

		await assert.resolves(() => cli.withArgs([packageName]).withFlags({ network, token }).execute(Command));

		spyOnUpdate.calledWith(token, network, packageName);
	});
});
