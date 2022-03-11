import { Container, Services } from "@arkecosystem/core-cli";
import { Console, describe } from "@arkecosystem/core-test-framework";
import prompts from "prompts";

import { Command } from "./reinstall";

describe<{
	cli: Console;
	processManager: Services.ProcessManager;
	installer: Services.Installer;
}>("ReinstallCommand", ({ beforeEach, it, assert, stub }) => {
	beforeEach((context) => {
		context.cli = new Console();
		context.processManager = context.cli.app.get(Container.Identifiers.ProcessManager);
		context.installer = context.cli.app.get(Container.Identifiers.Installer);
	});

	it("should reinstall without a prompt if the [--force] flag is used", async ({
		cli,
		processManager,
		installer,
	}) => {
		const spyOnInstall = stub(installer, "install");
		const spyOnUpdate = stub(processManager, "update");

		await cli.withFlags({ force: true }).execute(Command);

		spyOnInstall.calledOnce();
		spyOnUpdate.calledOnce();
	});

	it("should reinstall with a prompt confirmation", async ({ cli, installer, processManager }) => {
		const spyOnInstall = stub(installer, "install");
		const spyOnUpdate = stub(processManager, "update");
		prompts.inject([true]);

		await cli.execute(Command);

		spyOnInstall.calledOnce();
		spyOnUpdate.calledOnce();
	});

	it("should not reinstall without a prompt confirmation", async ({ cli, installer, processManager }) => {
		const spyOnInstall = stub(installer, "install");
		const spyOnUpdate = stub(processManager, "update");
		prompts.inject([false]);

		await assert.rejects(() => cli.execute(Command), "You'll need to confirm the reinstall to continue.");

		spyOnInstall.neverCalled();
		spyOnUpdate.neverCalled();
	});

	it("should should ask to restart processes if they are online", async ({ cli, installer, processManager }) => {
		const spyOnInstall = stub(installer, "install");
		const spyOnUpdate = stub(processManager, "update");
		const spyOnIsOnline = stub(processManager, "isOnline").returnValue(true);
		const spyOnRestart = stub(processManager, "restart");
		prompts.inject([true]); // restart core
		prompts.inject([true]); // restart relay
		prompts.inject([true]); // restart forger

		await cli.withFlags({ force: true }).execute(Command);

		spyOnInstall.calledOnce();
		spyOnUpdate.calledOnce();
		spyOnIsOnline.calledTimes(3);
		spyOnRestart.calledTimes(3);
	});
});
