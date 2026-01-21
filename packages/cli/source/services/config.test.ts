import { writeFileSync } from "fs";
import { setGracefulCleanup } from "tmp";

import { Console, describe } from "@mainsail/test-framework";
import { Config } from "./config";
import { Identifiers } from "@mainsail/constants";

describe<{
	cli: Console;
	config: Config;
	configPath: string;
}>("Config", ({ beforeEach, afterAll, it, assert, spy }) => {
	beforeEach((context) => {
		context.cli = new Console();

		context.config = context.cli.app.resolve(Config);
		context.configPath = context.cli.app.getConsolePath("config", "config.json");
	});

	afterAll(() => setGracefulCleanup());

	it("should return all configurations", ({ config }) => {
		assert.equal(config.all(), {
			channel: "next",
			plugins: [],
		});
	});

	it("should setup a new config with default values", ({ config }) => {
		assert.equal(config.get("channel"), "next");
	});

	it("#load - should restore the defaults if the config has been corrupted", ({ config, configPath }) => {
		writeFileSync(configPath, "junk");

		const restoreDefaults = spy(config, "restoreDefaults");

		config.load();

		restoreDefaults.calledOnce();

		assert.equal(config.get("channel"), "next");
		assert.equal(config.get("plugins"), []);
	});

	it("#load - should restore the defaults if the config is not object", ({ config, configPath }) => {
		writeFileSync(configPath, JSON.stringify([]));

		const restoreDefaults = spy(config, "restoreDefaults");

		config.load();

		restoreDefaults.calledOnce();

		assert.equal(config.get("channel"), "next");
		assert.equal(config.get("plugins"), []);
	});

	it("#save - should restore the defaults if the config has been corrupted", ({ config }) => {
		assert.equal(config.get("channel"), "next");
		assert.equal(config.get("plugins"), []);

		config.set("channel", "latest");
		config.set("plugins", ["something"]);

		config.save();

		assert.equal(config.get("channel"), "latest");
		assert.equal(config.get("plugins"), ["something"]);
	});

	it("#restoreDefaults - should restore the defaults if the config has been corrupted", ({ config }) => {
		config.forget("channel");
		config.forget("plugins");

		assert.undefined(config.get("channel"));
		assert.undefined(config.get("plugins"));

		config.restoreDefaults();

		assert.equal(config.get("channel"), "next");
		assert.equal(config.get("plugins"), []);
	});

	it("#restoreDefaults - should set channel to default if version is not set in package.json", ({ config, cli }) => {
		config.forget("channel");
		config.forget("plugins");

		assert.undefined(config.get("channel"));
		assert.undefined(config.get("plugins"));

		cli.app.get<any>(Identifiers.Cli.Package).version = undefined;

		config.restoreDefaults();

		assert.equal(config.get("channel"), "rc");
		assert.equal(config.get("plugins"), []);
	});
});
