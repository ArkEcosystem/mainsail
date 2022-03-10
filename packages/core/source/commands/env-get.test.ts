import { Console, describe } from "@arkecosystem/core-test-framework";
import { ensureDirSync, ensureFileSync, writeFileSync } from "fs-extra";
import { dirSync, setGracefulCleanup } from "tmp";

import { Command } from "./env-get";

describe<{
	cli: Console;
}>("EnvGetCommand", ({ beforeEach, afterAll, it, stub, assert }) => {
	beforeEach((context) => {
		process.env.CORE_PATH_CONFIG = dirSync().name;

		context.cli = new Console();
	});

	afterAll(() => setGracefulCleanup());

	it("should get the value of an environment variable", async ({ cli }) => {
		writeFileSync(`${process.env.CORE_PATH_CONFIG}/.env`, "CORE_LOG_LEVEL=emergency");

		let message: string;
		stub(console, "log").callsFake((m) => (message = m));

		await cli.withFlags({ key: "CORE_LOG_LEVEL" }).execute(Command);

		assert.equal(message, "emergency");
	});

	it("should fail to get the value of a non-existent environment variable", async ({ cli }) => {
		ensureFileSync(`${process.env.CORE_PATH_CONFIG}/.env`);

		await assert.rejects(
			() => cli.withFlags({ key: "FAKE_KEY" }).execute(Command),
			'The "FAKE_KEY" doesn\'t exist.',
		);
	});

	it("should fail if the environment configuration doesn't exist", async ({ cli }) => {
		ensureDirSync(`${process.env.CORE_PATH_CONFIG}/jestnet`);

		await assert.rejects(
			() => cli.withFlags({ key: "FAKE_KEY" }).execute(Command),
			`No environment file found at ${process.env.CORE_PATH_CONFIG}/.env`,
		);
	});
});
