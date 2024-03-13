import { writeFileSync } from "fs";
import { setGracefulCleanup } from "tmp";

import { Console, describe } from "../../../test-framework/source";
import { Config } from "./config";

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
});
