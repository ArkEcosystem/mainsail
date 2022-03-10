import { Container, Services } from "@arkecosystem/core-cli";
import { Console, describe } from "@arkecosystem/core-test-framework";

import { Command } from "./plugin-remove";

describe<{
	cli: Console;
	pluginManager: Services.PluginManager;
}>("PluginRemoveCommand", ({ beforeEach, it, assert, stub }) => {
	const packageName = "dummyPackageName";
	const token = "ark";
	const network = "testnet";

	beforeEach((context) => {
		context.cli = new Console();

		context.pluginManager = context.cli.app.get(Container.Identifiers.PluginManager);
	});

	it("should throw when package name is not provided", async ({ cli, pluginManager }) => {
		const spyOnRemove = stub(pluginManager, "remove");

		await assert.rejects(() => cli.execute(Command), `"package" is required`);

		spyOnRemove.neverCalled();
	});

	it("should call remove", async ({ cli, pluginManager }) => {
		const spyOnRemove = stub(pluginManager, "remove");
		stub(cli.app, "getCorePath").returnValueOnce(null);

		await assert.resolves(() => cli.withArgs([packageName]).withFlags({ network, token }).execute(Command));

		spyOnRemove.calledWith(token, network, packageName);
	});
});
