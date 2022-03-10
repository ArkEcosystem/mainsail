import { Console, describe } from "@arkecosystem/core-test-framework";
import envfile from "envfile";
import { ensureFileSync, removeSync } from "fs-extra";
import { dirSync, setGracefulCleanup } from "tmp";

import { Command } from "./env-set";

describe<{
	cli: Console;
}>("EnvSetCommand", ({ beforeEach, afterAll, it, assert }) => {
	beforeEach((context) => {
		process.env.CORE_PATH_CONFIG = dirSync().name;

		context.cli = new Console();
	});

	afterAll(() => setGracefulCleanup());

	it("should set the value of an environment variable", async ({ cli }) => {
		const environmentFile = `${process.env.CORE_PATH_CONFIG}/.env`;

		removeSync(environmentFile);
		ensureFileSync(environmentFile);

		await cli.withFlags({ key: "key1", value: "value" }).execute(Command);

		assert.equal(envfile.parseFileSync(environmentFile), { key1: "value" });

		await cli.withFlags({ key: "key2", value: "value" }).execute(Command);

		assert.equal(envfile.parseFileSync(environmentFile), { key1: "value", key2: "value" });
	});
});
