import envfile from "envfile";
import fs from "fs-extra";

import { Console, describe } from "../../../core-test-framework";
import { Environment } from "./environment";

describe<{
	environment: Environment;
}>("Environment", ({ beforeEach, it, assert, stub }) => {
	beforeEach((context) => {
		const cli = new Console();

		context.environment = cli.app.resolve(Environment);
	});

	it("should get all paths for the given token and network", async ({ environment }) => {
		assert.equal(Object.keys(environment.getPaths("ark", "testnet")), ["data", "config", "cache", "log", "temp"]);
	});

	it("should respect the CORE_PATH_CONFIG environment variable", async ({ environment }) => {
		process.env.CORE_PATH_CONFIG = "something";

		assert.true(environment.getPaths("ark", "testnet").config.endsWith("/something"));
	});

	it("should fail to update the variables if the file doesn't exist", async ({ environment }) => {
		assert.throws(() => environment.updateVariables("some-file", {}), "No environment file found at some-file.");
	});

	it("should update the variables", async ({ environment }) => {
		// Arrange
		const existsSync = stub(fs, "existsSync").returnValue(true);
		const parseFileSync = stub(envfile, "parseFileSync").returnValue({});
		const writeFileSync = stub(fs, "writeFileSync");

		// Act
		environment.updateVariables("stub", { key: "value" });

		// Assert
		existsSync.calledWith("stub");
		parseFileSync.calledWith("stub");
		writeFileSync.calledWith("stub", "key=value");
	});
});
