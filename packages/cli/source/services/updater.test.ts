import prompts from "prompts";

import { Console, describe } from "@mainsail/test-framework";
import { versionNext } from "../../test/fixtures/latest-version";
import { Identifiers } from "@mainsail/constants";
import { Config } from "./config";
import { Updater } from "./updater";

describe<{
	cli: Console;
	updater: Updater;
	config: Config;
}>("Updater", ({ beforeAll, beforeEach, afterAll, it, stub, spy, assert, nock }) => {
	beforeEach((context) => {
		nock.cleanAll();

		context.cli = new Console();
		context.updater = context.cli.app.resolve(Updater);
		context.config = context.cli.app.get(Identifiers.Cli.Service.Config);
	});

	beforeAll(() => nock.disableNetConnect());

	afterAll(() => nock.enableNetConnect());

	it("#logStatus - should render update message if update is available", async ({ cli, updater }) => {
		stub(updater, "check").resolvedValue(true);
		const spyWarning = spy(cli.app.get(Identifiers.Cli.Component.Warning), "render");

		await updater.logStatus();

		spyWarning.calledOnce();
	});

	it("#logStatus - should not render update message if update is not available", async ({ cli, updater }) => {
		stub(updater, "check").resolvedValue(false);
		const spyWarning = spy(cli.app.get(Identifiers.Cli.Component.Warning), "render");

		await updater.logStatus();

		spyWarning.neverCalled();
	});

	it("#check - should return false if the latest version cannot be retrieved", async ({ cli, updater }) => {
		nock.fake(/.*/).get("/@mainsail%2Fcore").reply(200, {});

		const spyWarning = spy(cli.app.get(Identifiers.Cli.Component.Warning), "render");

		assert.false(await updater.check());
		spyWarning.calledWith('We were unable to find any releases for the "next" channel.');
	});

	it("#check - should return false if the latest version is already installed", async ({ updater }) => {
		nock.fake(/.*/).get("/@mainsail%2Fcore").reply(200, versionNext);

		assert.false(await updater.check());
	});

	it("#check - should return false if the last check has been within the last 24 hours ago", async ({
		config,
		updater,
	}) => {
		nock.fake(/.*/).get("/@mainsail%2Fcore").reply(200, versionNext);

		config.set("lastUpdateCheck", Date.now());

		assert.false(await updater.check());
	});

	it("#check - should check if the last check has been within the last 24 hours ago", async ({ config, updater }) => {
		nock.fake(/.*/).get("/@mainsail%2Fcore").reply(200, versionNext);
		const spyConfigSet = spy(config, "set");

		config.set("latestVersion", versionNext);
		config.set("lastUpdateCheck", Date.now() - 1000 * 60 * 60 * 24);

		assert.false(await updater.check());

		spyConfigSet.called();
		spyConfigSet.calledWith("lastUpdateCheck");
	});

	it("#check - should return true if a new version is available", async ({ config, updater }) => {
		const response = { ...versionNext };
		response["dist-tags"].next = "4.0.0-next.0";
		response.versions["4.0.0-next.0"] = { ...response.versions["2.5.0-next.10"] };
		response.versions["4.0.0-next.0"] = {
			...response.versions["2.5.0-next.10"],
			version: "4.0.0-next.0",
		};

		nock.fake(/.*/).get("/@mainsail%2Fcore").reply(200, response);

		config.set("latestVersion", undefined);

		const spySet = spy(config, "set");

		assert.true(await updater.check());
		spySet.calledTimes(2);
	});

	it("#update - should return early if the latest version is not present", async ({ updater }) => {
		assert.false(await updater.update());
	});

	it("#update - should update without a prompt if a new version is available", async ({ cli, updater }) => {
		// Arrange...
		const response = { ...versionNext };
		response["dist-tags"].next = "4.0.0-next.0";
		response.versions["4.0.0-next.0"] = { ...response.versions["2.5.0-next.10"] };
		response.versions["4.0.0-next.0"] = {
			...response.versions["2.5.0-next.10"],
			version: "4.0.0-next.0",
		};

		nock.fake(/.*/).get("/@mainsail%2Fcore").reply(200, response);

		const spySpinner = stub(cli.app.get(Identifiers.Cli.Component.Spinner), "render").returnValue({
			start: () => {},
			succeed: () => {},
		});
		const spyInstaller = stub(cli.app.get(Identifiers.Cli.Service.Installer), "install");
		const spyProcessManager = stub(cli.app.get(Identifiers.Cli.Service.ProcessManager), "update");

		// Act...
		await updater.check();

		const update = await updater.update(true, true);

		// // Assert...
		assert.true(update);
		spySpinner.calledOnce();
		spyInstaller.calledOnce();
		spyProcessManager.calledOnce();
	});

	it("#update - should update with a prompt if a new version is available", async ({ cli, updater }) => {
		// Arrange...
		const response = { ...versionNext };
		response["dist-tags"].next = "4.0.0-next.0";
		response.versions["4.0.0-next.0"] = { ...response.versions["2.5.0-next.10"] };
		response.versions["4.0.0-next.0"] = {
			...response.versions["2.5.0-next.10"],
			version: "4.0.0-next.0",
		};

		nock.fake(/.*/).get("/@mainsail%2Fcore").reply(200, response);

		const spySpinner = stub(cli.app.get(Identifiers.Cli.Component.Spinner), "render").returnValue({
			start: () => {},
			succeed: () => {},
		});
		const spyInstaller = stub(cli.app.get(Identifiers.Cli.Service.Installer), "install");
		const spyProcessManager = stub(cli.app.get(Identifiers.Cli.Service.ProcessManager), "update");

		prompts.inject([true]);

		// Act...
		await updater.check();

		const update = await updater.update();

		// Assert...
		assert.true(update);
		spySpinner.calledOnce();
		spyInstaller.calledOnce();
		spyProcessManager.neverCalled();
	});

	it("#update - should fail to update without a confirmation", async ({ cli, updater }) => {
		// Arrange...
		const response = { ...versionNext };
		response["dist-tags"].next = "4.0.0-next.0";
		response.versions["4.0.0-next.0"] = { ...response.versions["2.5.0-next.10"] };
		response.versions["4.0.0-next.0"] = {
			...response.versions["2.5.0-next.10"],
			version: "4.0.0-next.0",
		};

		nock.fake(/.*/).get("/@mainsail%2Fcore").reply(200, response);

		const spySpinner = stub(cli.app.get(Identifiers.Cli.Component.Spinner), "render").returnValue({
			start: () => {},
			succeed: () => {},
		});
		const spyInstaller = stub(cli.app.get(Identifiers.Cli.Service.Installer), "install");
		const spyProcessManager = stub(cli.app.get(Identifiers.Cli.Service.ProcessManager), "update");

		prompts.inject([false]);

		// Act...
		await updater.check();
		await assert.rejects(() => updater.update(), "You'll need to confirm the update to continue.");

		// Assert...
		spySpinner.neverCalled();
		spyInstaller.neverCalled();
		spyProcessManager.neverCalled();
	});
});
