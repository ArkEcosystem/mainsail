import { Console, describe } from "@arkecosystem/core-test-framework";
import { removeSync, writeFileSync } from "fs-extra";
import { dirSync, setGracefulCleanup } from "tmp";

import { Command } from "./env-list";

describe<{
	cli: Console;
}>("EnvListCommand", ({ beforeEach, afterAll, it, assert, stub }) => {
	beforeEach((context) => {
		process.env.CORE_PATH_CONFIG = dirSync().name;

		context.cli = new Console();
	});

	afterAll(() => setGracefulCleanup());

	it("should fail if the environment configuration doesn't exist", async ({ cli }) => {
		await assert.rejects(
			() => cli.execute(Command),
			`No environment file found at ${process.env.CORE_PATH_CONFIG}/.env`,
		);
	});

	it("should list all environment variables", async ({ cli }) => {
		let message: string;
		stub(console, "log").callsFake((m) => (message = m));

		const environmentFile = `${process.env.CORE_PATH_CONFIG}/.env`;

		removeSync(environmentFile);
		writeFileSync(environmentFile, "someKey=someValue", { flag: "w" });

		await cli.execute(Command);

		assert.true(message.includes("Key"));
		assert.true(message.includes("Value"));
		assert.true(message.includes("someKey"));
		assert.true(message.includes("someValue"));
	});
});
