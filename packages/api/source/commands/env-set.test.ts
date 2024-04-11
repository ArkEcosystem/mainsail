/* eslint-disable unicorn/prevent-abbreviations */
import { Identifiers } from "@mainsail/contracts";
import { parse } from "envfile";
import { readFileSync } from "fs";
import { ensureFileSync, removeSync } from "fs-extra/esm";
import { dirSync, setGracefulCleanup } from "tmp";

import { Console, describe } from "../../../test-framework/source";
import { Command } from "./env-set";

describe<{
	cli: Console;
}>("EnvSetCommand", ({ beforeEach, afterAll, it, assert }) => {
	beforeEach((context) => {
		process.env.CORE_PATH_CONFIG = dirSync().name;

		context.cli = new Console();
		context.cli.app.rebind(Identifiers.Application.Name).toConstantValue("core");
	});

	afterAll(() => setGracefulCleanup());

	it("should set the value of an environment variable", async ({ cli }) => {
		const environmentFile = `${process.env.CORE_PATH_CONFIG}/core/.env`;

		removeSync(environmentFile);
		ensureFileSync(environmentFile);

		await cli.withFlags({ key: "key1", value: "value" }).execute(Command);

		assert.equal(parse(readFileSync(environmentFile, "utf8")), { key1: "value" });

		await cli.withFlags({ key: "key2", value: "value" }).execute(Command);

		assert.equal(parse(readFileSync(environmentFile, "utf8")), { key1: "value", key2: "value" });
	});
});
