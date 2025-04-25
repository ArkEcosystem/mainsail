/* eslint-disable unicorn/prevent-abbreviations */
import { writeFileSync } from "fs";
import { ensureDirSync, ensureFileSync } from "fs-extra";
import { dirSync, setGracefulCleanup } from "tmp";

import { Console, describe } from "../../../test-framework/source";
import { Command } from "./env-get";

describe<{
	cli: Console;
}>("EnvGetCommand", ({ beforeEach, afterAll, it, stub, assert }) => {
	beforeEach((context) => {
		process.env.MAINSAIL_PATH_CONFIG = dirSync().name;

		ensureDirSync(`${process.env.MAINSAIL_PATH_CONFIG}/core`);

		context.cli = new Console();
	});

	afterAll(() => setGracefulCleanup());

	it("should get the value of an environment variable", async ({ cli }) => {
		writeFileSync(`${process.env.MAINSAIL_PATH_CONFIG}/core/.env`, "MAINSAIL_LOG_LEVEL=emergency");

		let message: string;
		stub(console, "log").callsFake((m) => (message = m));

		await cli.withFlags({ key: "MAINSAIL_LOG_LEVEL" }).execute(Command);

		assert.equal(message, "emergency");
	});

	it("should fail to get the value of a non-existent environment variable", async ({ cli }) => {
		ensureFileSync(`${process.env.MAINSAIL_PATH_CONFIG}/core/.env`);

		await assert.rejects(
			() => cli.withFlags({ key: "FAKE_KEY" }).execute(Command),
			'The "FAKE_KEY" doesn\'t exist.',
		);
	});

	it("should fail if the environment configuration doesn't exist", async ({ cli }) => {
		ensureDirSync(`${process.env.MAINSAIL_PATH_CONFIG}/core/jestnet`);

		await assert.rejects(
			() => cli.withFlags({ key: "FAKE_KEY" }).execute(Command),
			`No environment file found at ${process.env.MAINSAIL_PATH_CONFIG}/core/.env`,
		);
	});
});
