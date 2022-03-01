import nock from "nock";
import prompts from "prompts";

import { Console, describe } from "../../../core-test-framework";
import { versionNext } from "../../test/fixtures/latest-version";
import { Identifiers } from "../ioc";
import { Config } from "./config";
import { Updater } from "./updater";

describe<{
	cli: Console;
	updater: Updater;
	config: Config;
}>("Updater", ({ beforeAll, beforeEach, afterAll, it, stub, spy, assert }) => {
	beforeEach((context) => {
		nock.cleanAll();

		context.cli = new Console();
		context.updater = context.cli.app.resolve(Updater);
		context.config = context.cli.app.get(Identifiers.Config);
	});

	beforeAll(() => nock.disableNetConnect());

	afterAll(() => nock.enableNetConnect());

	it("#check - should forget the latest version if it has one from a previous check", async ({ config, updater }) => {
		nock(/.*/).get("/@arkecosystem%2Fcore").reply(200, versionNext);

		config.set("latestVersion", {});

		const spyForget = spy(config, "forget");

		assert.false(await updater.check());
		spyForget.calledWith("latestVersion");
	});

	it("#check - should return false if the latest version cannot be retrieved", async ({ cli, updater }) => {
		nock(/.*/).get("/@arkecosystem%2Fcore").reply(200, {});

		const spyWarning = spy(cli.app.get(Identifiers.Warning), "render");

		assert.false(await updater.check());
		spyWarning.calledWith('We were unable to find any releases for the "next" channel.');
	});

	it("#check - should return false if the latest version is already installed", async ({ updater }) => {
		nock(/.*/).get("/@arkecosystem%2Fcore").reply(200, versionNext);

		assert.false(await updater.check());
	});

	it("#check - should return false if the last check has been within the last 24 hours ago", async ({
		config,
		updater,
	}) => {
		nock(/.*/).get("/@arkecosystem%2Fcore").reply(200, versionNext);

		config.set("lastUpdateCheck", Date.now());

		assert.false(await updater.check());
	});

	it("#check - should return true if a new version is available", async ({ config, updater }) => {
		const response = { ...versionNext };
		response["dist-tags"].next = "4.0.0-next.0";
		response.versions["4.0.0-next.0"] = { ...response.versions["2.5.0-next.10"] };
		response.versions["4.0.0-next.0"] = {
			...response.versions["2.5.0-next.10"],
			version: "4.0.0-next.0",
		};

		nock(/.*/).get("/@arkecosystem%2Fcore").reply(200, response);

		config.set("latestVersion", {});

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

		nock(/.*/).get("/@arkecosystem%2Fcore").reply(200, response);

		const spySpinner = stub(cli.app.get(Identifiers.Spinner), "render").returnValue({
			start: () => {},
			succeed: () => {},
		});
		const spyInstaller = stub(cli.app.get(Identifiers.Installer), "install");
		const spyProcessManager = stub(cli.app.get(Identifiers.ProcessManager), "update");

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

		nock(/.*/).get("/@arkecosystem%2Fcore").reply(200, response);

		const spySpinner = stub(cli.app.get(Identifiers.Spinner), "render").returnValue({
			start: () => {},
			succeed: () => {},
		});
		const spyInstaller = stub(cli.app.get(Identifiers.Installer), "install");
		const spyProcessManager = stub(cli.app.get(Identifiers.ProcessManager), "update");

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

		nock(/.*/).get("/@arkecosystem%2Fcore").reply(200, response);

		const spySpinner = stub(cli.app.get(Identifiers.Spinner), "render").returnValue({
			start: () => {},
			succeed: () => {},
		});
		const spyInstaller = stub(cli.app.get(Identifiers.Installer), "install");
		const spyProcessManager = stub(cli.app.get(Identifiers.ProcessManager), "update");

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
