import { Identifiers } from "@mainsail/constants";
import { describe } from "@mainsail/test-runner";
import { resolve } from "path";

import { Application } from "../application";
import { RegisterBasePaths } from "./register-base-paths";

const PATH_TYPES = ["data", "config", "cache", "log", "temp"];

describe<{
	app: Application;
	fileSystem: Record<string, any>;
	handler: RegisterBasePaths;
}>("RegisterBasePaths", ({ assert, afterEach, beforeEach, it, spy }) => {
	beforeEach((context) => {
		context.fileSystem = { ensureDirSync: () => {}, existsSync: () => true };

		context.app = new Application();
		context.app.bind(Identifiers.Application.Name).toConstantValue("mainsail-test");
		context.app.bind(Identifiers.Services.Filesystem.Service).toConstantValue(context.fileSystem);

		context.handler = context.app.resolve(RegisterBasePaths);
	});

	afterEach(() => {
		for (const type of PATH_TYPES) {
			delete process.env[`MAINSAIL_PATH_${type.toUpperCase()}`];
		}
	});

	it("should resolve and bind every base path", async ({ app, handler }) => {
		await handler.bootstrap();

		for (const type of PATH_TYPES) {
			assert.true(app.isBound(`path.${type}`));
			assert.string(app.get(`path.${type}`));
			assert.string(process.env[`MAINSAIL_PATH_${type.toUpperCase()}`]);
		}
	});

	it("should ensure the directory exists for every path", async ({ handler, fileSystem }) => {
		const spyEnsure = spy(fileSystem, "ensureDirSync");

		await handler.bootstrap();

		spyEnsure.calledTimes(PATH_TYPES.length);
	});

	it("should honour a path defined via process environment variables", async ({ app, handler }) => {
		process.env.MAINSAIL_PATH_DATA = "/tmp/custom-data";
		process.env.MAINSAIL_PATH_CONFIG = "/tmp/custom-config";

		await handler.bootstrap();

		assert.equal(app.get("path.data"), resolve("/tmp/custom-data", "mainsail-test"));
		assert.equal(app.get("path.config"), resolve("/tmp/custom-config", "mainsail-test"));
	});
});
