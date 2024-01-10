import { Console, describe } from "@mainsail/test-framework";
import { parse } from "envfile";
import { ensureFileSync, readFileSync, removeSync } from "fs-extra";
import { dirSync, setGracefulCleanup } from "tmp";

import { Command } from "./env-set";
import { Identifiers } from "@mainsail/contracts";

describe<{
	cli: Console;
}>("EnvSetCommand", ({ beforeEach, afterAll, it, assert }) => {
	beforeEach((context) => {
		process.env.CORE_PATH_CONFIG = dirSync().name;

		context.cli = new Console();
		context.cli.app.rebind(Identifiers.Application.Name).toConstantValue("mainsail-api");
	});

	afterAll(() => setGracefulCleanup());

	it("should set the value of an environment variable", async ({ cli }) => {
		const environmentFile = `${process.env.CORE_PATH_CONFIG}/mainsail-api/.env`;

		removeSync(environmentFile);
		ensureFileSync(environmentFile);

		await cli.withFlags({ key: "key1", value: "value" }).execute(Command);

		assert.equal(parse(readFileSync(environmentFile, "utf8")), { key1: "value" });

		await cli.withFlags({ key: "key2", value: "value" }).execute(Command);

		assert.equal(parse(readFileSync(environmentFile, "utf8")), { key1: "value", key2: "value" });
	});
});
