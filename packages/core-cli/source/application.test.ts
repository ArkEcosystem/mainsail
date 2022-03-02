import { describe } from "../../core-test-framework";
import { envPaths as environmentPaths } from "./env-paths";
import { Application, Container } from "./index";

@Container.injectable()
class StubClass {}

describe<{
	app: Application;
}>("ActionFactory", ({ beforeEach, it, assert }) => {
	beforeEach((context) => {
		context.app = new Application(new Container.Container());
	});

	it("should bind a value to the IoC container", ({ app }) => {
		assert.false(app.isBound("key"));

		app.bind("key").toConstantValue("value");

		assert.true(app.isBound("key"));
	});

	it("should rebind a value to the IoC container", ({ app }) => {
		assert.false(app.isBound("key"));

		app.rebind("key").toConstantValue("value");

		assert.equal(app.get("key"), "value");
		assert.true(app.isBound("key"));

		app.rebind("key").toConstantValue("value-new");

		assert.equal(app.get("key"), "value-new");
	});

	it("should unbind a value from the IoC container", ({ app }) => {
		app.bind("key").toConstantValue("value");

		assert.true(app.isBound("key"));

		app.unbind("key");

		assert.false(app.isBound("key"));
	});

	it("should get a value from the IoC container", ({ app }) => {
		app.bind("key").toConstantValue("value");

		assert.equal(app.get("key"), "value");
	});

	it("should resolve a value from the IoC container", ({ app }) => {
		assert.instance(app.resolve(StubClass), StubClass);
	});

	it("should get core paths", ({ app }) => {
		const paths = environmentPaths.get("ark", { suffix: "core" });

		app.bind(Container.Identifiers.ApplicationPaths).toConstantValue(paths);

		assert.equal(app.getCorePath("data"), paths.data);
		assert.equal(app.getCorePath("config"), paths.config);
		assert.equal(app.getCorePath("cache"), paths.cache);
		assert.equal(app.getCorePath("log"), paths.log);
		assert.equal(app.getCorePath("temp"), paths.temp);
	});

	it("should get console paths with a file", ({ app }) => {
		const paths = environmentPaths.get("ark", { suffix: "core" });

		app.bind(Container.Identifiers.ApplicationPaths).toConstantValue(paths);

		assert.equal(app.getCorePath("data", "file"), `${paths.data}/file`);
		assert.equal(app.getCorePath("config", "file"), `${paths.config}/file`);
		assert.equal(app.getCorePath("cache", "file"), `${paths.cache}/file`);
		assert.equal(app.getCorePath("log", "file"), `${paths.log}/file`);
		assert.equal(app.getCorePath("temp", "file"), `${paths.temp}/file`);
	});

	it("should get console paths", ({ app }) => {
		const paths = environmentPaths.get("ark", { suffix: "core" });

		app.bind(Container.Identifiers.ConsolePaths).toConstantValue(paths);

		assert.equal(app.getConsolePath("data"), paths.data);
		assert.equal(app.getConsolePath("config"), paths.config);
		assert.equal(app.getConsolePath("cache"), paths.cache);
		assert.equal(app.getConsolePath("log"), paths.log);
		assert.equal(app.getConsolePath("temp"), paths.temp);
	});

	it("should get console paths with a file", ({ app }) => {
		const paths = environmentPaths.get("ark", { suffix: "core" });

		app.bind(Container.Identifiers.ConsolePaths).toConstantValue(paths);

		assert.equal(app.getConsolePath("data", "file"), `${paths.data}/file`);
		assert.equal(app.getConsolePath("config", "file"), `${paths.config}/file`);
		assert.equal(app.getConsolePath("cache", "file"), `${paths.cache}/file`);
		assert.equal(app.getConsolePath("log", "file"), `${paths.log}/file`);
		assert.equal(app.getConsolePath("temp", "file"), `${paths.temp}/file`);
	});
});
