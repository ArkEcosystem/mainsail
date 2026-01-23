import { injectable } from "@mainsail/container";

import { describe } from "@mainsail/test-runner";
import { envPaths as environmentPaths } from "./env-paths";
import { Application } from "./index";
import { Identifiers } from "@mainsail/constants";

@injectable()
class StubClass {}

describe<{
	app: Application;
}>("ActionFactory", ({ beforeEach, it, assert }) => {
	beforeEach((context) => {
		context.app = new Application();
	});

	it("should get core paths", ({ app }) => {
		const paths = environmentPaths.get("ark", { suffix: "core" });

		app.bind(Identifiers.Cli.Paths.Application).toConstantValue(paths);

		assert.equal(app.getCorePath("data"), paths.data);
		assert.equal(app.getCorePath("config"), paths.config);
		assert.equal(app.getCorePath("cache"), paths.cache);
		assert.equal(app.getCorePath("log"), paths.log);
		assert.equal(app.getCorePath("temp"), paths.temp);
	});

	it("should get console paths with a file", ({ app }) => {
		const paths = environmentPaths.get("ark", { suffix: "core" });

		app.bind(Identifiers.Cli.Paths.Application).toConstantValue(paths);

		assert.equal(app.getCorePath("data", "file"), `${paths.data}/file`);
		assert.equal(app.getCorePath("config", "file"), `${paths.config}/file`);
		assert.equal(app.getCorePath("cache", "file"), `${paths.cache}/file`);
		assert.equal(app.getCorePath("log", "file"), `${paths.log}/file`);
		assert.equal(app.getCorePath("temp", "file"), `${paths.temp}/file`);
	});

	it("should get console paths", ({ app }) => {
		const paths = environmentPaths.get("ark", { suffix: "core" });

		app.bind(Identifiers.Cli.Paths.Console).toConstantValue(paths);

		assert.equal(app.getConsolePath("data"), paths.data);
		assert.equal(app.getConsolePath("config"), paths.config);
		assert.equal(app.getConsolePath("cache"), paths.cache);
		assert.equal(app.getConsolePath("log"), paths.log);
		assert.equal(app.getConsolePath("temp"), paths.temp);
	});

	it("should get console paths with a file", ({ app }) => {
		const paths = environmentPaths.get("ark", { suffix: "core" });

		app.bind(Identifiers.Cli.Paths.Console).toConstantValue(paths);

		assert.equal(app.getConsolePath("data", "file"), `${paths.data}/file`);
		assert.equal(app.getConsolePath("config", "file"), `${paths.config}/file`);
		assert.equal(app.getConsolePath("cache", "file"), `${paths.cache}/file`);
		assert.equal(app.getConsolePath("log", "file"), `${paths.log}/file`);
		assert.equal(app.getConsolePath("temp", "file"), `${paths.temp}/file`);
	});
});
