import fs from "fs-extra";
import { join } from "path";
import { setGracefulCleanup } from "tmp";

import { Console, describe } from "../../../core-test-framework";
import { PluginManager } from "./plugin-manager";
import { File, Git, NPM } from "./source-providers";

describe<{
	pluginManager: PluginManager;
}>("DiscoverPlugins", ({ beforeEach, afterAll, assert, it, stub, spyFn }) => {
	const token = "ark";
	const network = "testnet";
	const packageName = "dummyPackageName";

	beforeEach((context) => {
		const cli = new Console();

		context.pluginManager = cli.app.resolve(PluginManager);
	});

	afterAll(() => setGracefulCleanup());

	it("#discover - should discover packages containing package.json", async ({ pluginManager }) => {
		const pluginsPath: string = join(__dirname, "../../test/plugins");

		stub(pluginManager, "getPluginsPath").returnValue(pluginsPath);

		const plugins = await pluginManager.list(token, network);

		assert.equal(plugins, [
			{
				name: "@namespace/package2",
				path: join(pluginsPath, "/@namespace/package2"),
				version: "2.0.0",
			},
			{
				name: "package1",
				path: join(pluginsPath, "/package1"),
				version: "1.0.0",
			},
		]);
	});

	it("#discover - should return empty array if path doesn't exist", async ({ pluginManager }) => {
		const plugins = await pluginManager.list(token, "undefined");

		assert.equal(plugins, []);
	});

	it("#install - should throw an error when package doesn't exist", async ({ pluginManager }) => {
		const spyNpmExists = stub(NPM.prototype, "exists").resolvedValue(false);
		const spyGitExists = stub(Git.prototype, "exists").resolvedValue(false);
		const spyFileExists = stub(File.prototype, "exists").resolvedValue(false);

		const spyNpmInstall = stub(NPM.prototype, "install");
		const spyGitInstall = stub(Git.prototype, "install");
		const spyFileInstall = stub(File.prototype, "install");

		const errorMessage = `The given package [${packageName}] is neither a git nor a npm package.`;
		await assert.rejects(() => pluginManager.install(token, network, packageName), errorMessage);

		spyNpmExists.calledWith(packageName);
		spyGitExists.calledWith(packageName);
		spyFileExists.calledWith(packageName);

		spyNpmInstall.neverCalled();
		spyGitInstall.neverCalled();
		spyFileInstall.neverCalled();
	});

	it("#install - should call install on existing NPM package", async ({ pluginManager }) => {
		const spyNpmExists = stub(NPM.prototype, "exists").resolvedValue(true);
		const spyGitExists = stub(Git.prototype, "exists").resolvedValue(false);
		const spyFileExists = stub(File.prototype, "exists").resolvedValue(false);

		const spyNpmInstall = stub(NPM.prototype, "install");
		const spyGitInstall = stub(Git.prototype, "install");
		const spyFileInstall = stub(File.prototype, "install");

		await assert.resolves(() => pluginManager.install(token, network, packageName));

		spyNpmExists.calledWith(packageName);
		spyGitExists.calledWith(packageName);
		spyFileExists.calledWith(packageName);

		spyNpmInstall.calledOnce();
		spyGitInstall.neverCalled();
		spyFileInstall.neverCalled();
	});

	it("#install - should call install on existing NPM packages with version", async ({ pluginManager }) => {
		const spyNpmExists = stub(NPM.prototype, "exists").resolvedValue(true);
		const spyGitExists = stub(Git.prototype, "exists").resolvedValue(false);
		const spyFileExists = stub(File.prototype, "exists").resolvedValue(false);

		const spyNpmInstall = stub(NPM.prototype, "install");
		const spyGitInstall = stub(Git.prototype, "install");
		const spyFileInstall = stub(File.prototype, "install");

		const version = "3.0.0";
		await assert.resolves(() => pluginManager.install(token, network, packageName, version));

		spyNpmExists.calledWith(packageName, version);
		spyGitExists.calledWith(packageName, version);
		spyFileExists.calledWith(packageName, version);

		spyNpmInstall.calledOnce();
		spyGitInstall.neverCalled();
		spyFileInstall.neverCalled();
	});

	it("#install - should call install on existing GIT package", async ({ pluginManager }) => {
		const spyNpmExists = stub(NPM.prototype, "exists").resolvedValue(false);
		const spyGitExists = stub(Git.prototype, "exists").resolvedValue(true);
		const spyFileExists = stub(File.prototype, "exists").resolvedValue(false);

		const spyNpmInstall = stub(NPM.prototype, "install");
		const spyGitInstall = stub(Git.prototype, "install");
		const spyFileInstall = stub(File.prototype, "install");

		await assert.resolves(() => pluginManager.install(token, network, packageName));

		spyNpmExists.neverCalled();
		spyGitExists.calledWith(packageName);
		spyFileExists.calledWith(packageName);

		spyNpmInstall.neverCalled();
		spyGitInstall.calledOnce();
		spyFileInstall.neverCalled();
	});

	it("#install - should call install on existing File package", async ({ pluginManager }) => {
		const spyNpmExists = stub(NPM.prototype, "exists").resolvedValue(false);
		const spyGitExists = stub(Git.prototype, "exists").resolvedValue(false);
		const spyFileExists = stub(File.prototype, "exists").resolvedValue(true);

		const spyNpmInstall = stub(NPM.prototype, "install");
		const spyGitInstall = stub(Git.prototype, "install");
		const spyFileInstall = stub(File.prototype, "install");

		await assert.resolves(() => pluginManager.install(token, network, packageName));

		spyNpmExists.neverCalled();
		spyGitExists.neverCalled();
		spyFileExists.calledWith(packageName);

		spyNpmInstall.neverCalled();
		spyGitInstall.neverCalled();
		spyFileInstall.calledOnce();
	});

	it("#update - should throw when the plugin doesn't exist", async ({ pluginManager }) => {
		await assert.rejects(
			() => pluginManager.update(token, network, packageName),
			`The package [${packageName}] does not exist.`,
		);
	});

	it("#update - if the plugin is a git directory, it should be updated", async ({ pluginManager }) => {
		const spyGitUpdate = stub(Git.prototype, "update");
		stub(fs, "existsSync").returnValue(true);

		await assert.resolves(() => pluginManager.update(token, network, packageName));

		spyGitUpdate.calledOnce();
	});

	it("#update - if the plugin is a NPM package, it should be updated on default path", async ({ pluginManager }) => {
		const spyNpmUpdate = stub(NPM.prototype, "update");
		stub(fs, "existsSync").returnValueOnce(true).returnValue(false);

		await assert.resolves(() => pluginManager.update(token, network, packageName));

		spyNpmUpdate.calledOnce();
	});

	it("#remove - should throw when the plugin doesn't exist", async ({ pluginManager }) => {
		await assert.rejects(
			() => pluginManager.remove(token, network, packageName),
			`The package [${packageName}] does not exist.`,
		);
	});

	it("#remove - remove plugin if exist", async ({ pluginManager }) => {
		stub(fs, "existsSync").returnValue(true);
		const removeSync = stub(fs, "removeSync");

		await assert.resolves(() => pluginManager.remove(token, network, packageName));
		removeSync.calledOnce();
	});
});
