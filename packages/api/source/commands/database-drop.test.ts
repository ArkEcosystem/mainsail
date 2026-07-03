import { Pg } from "@mainsail/api-database";
import { Console } from "@mainsail/cli";
import { Identifiers } from "@mainsail/constants";
import { describe } from "@mainsail/test-runner";
import { writeFileSync } from "fs";
import { ensureDirSync } from "fs-extra";
import prompts from "prompts";
import { dirSync, setGracefulCleanup } from "tmp";

import { Command } from "./database-drop";

describe<{
	cli: Console;
}>("DatabaseDropCommand", ({ beforeEach, afterAll, it, assert, stub, spy }) => {
	const environment = [
		"MAINSAIL_DB_HOST=localhost",
		"MAINSAIL_DB_PORT=5432",
		"MAINSAIL_DB_DATABASE=test_db",
		"MAINSAIL_DB_USERNAME=test_user",
		"MAINSAIL_DB_PASSWORD=password",
	].join("\n");

	beforeEach((context) => {
		process.env.MAINSAIL_PATH_CONFIG = dirSync().name;

		ensureDirSync(`${process.env.MAINSAIL_PATH_CONFIG}/core`);

		context.cli = new Console();
	});

	afterAll(() => setGracefulCleanup());

	it("should fail if the environment file does not exist", async ({ cli }) => {
		await assert.rejects(
			() => cli.withFlags({ force: true }).execute(Command),
			`No environment file found at ${process.env.MAINSAIL_PATH_CONFIG}/core/.env.`,
		);
	});

	it("should fail if a database variable is missing from the environment file", async ({ cli }) => {
		writeFileSync(`${process.env.MAINSAIL_PATH_CONFIG}/core/.env`, "MAINSAIL_DB_HOST=localhost");

		await assert.rejects(
			() => cli.withFlags({ force: true }).execute(Command),
			`The "MAINSAIL_DB_DATABASE" doesn't exist.`,
		);
	});

	it("should abort without dropping when the confirmation is declined", async ({ cli }) => {
		writeFileSync(`${process.env.MAINSAIL_PATH_CONFIG}/core/.env`, environment);

		const connect = stub(Pg.Client.prototype, "connect");
		const log = spy(cli.app.get(Identifiers.Cli.Component.Log), "render");

		prompts.inject([false]);

		await cli.execute(Command);

		connect.neverCalled();
		log.calledWith("Aborting. Database was not dropped.");
	});

	it("should terminate active sessions and drop the database when confirmed", async ({ cli }) => {
		writeFileSync(`${process.env.MAINSAIL_PATH_CONFIG}/core/.env`, environment);

		const connect = stub(Pg.Client.prototype, "connect");
		const query = stub(Pg.Client.prototype, "query");
		const end = stub(Pg.Client.prototype, "end");

		prompts.inject([true]);

		await cli.execute(Command);

		connect.calledOnce();
		query.calledTimes(2);
		query.calledNthWith(1, 'DROP DATABASE IF EXISTS "test_db"');
		end.calledOnce();
	});

	it("should recreate an empty database when the init flag is set", async ({ cli }) => {
		writeFileSync(`${process.env.MAINSAIL_PATH_CONFIG}/core/.env`, environment);

		stub(Pg.Client.prototype, "connect");
		const query = stub(Pg.Client.prototype, "query");
		stub(Pg.Client.prototype, "end");

		await cli.withFlags({ force: true, init: true }).execute(Command);

		query.calledTimes(3);
		query.calledNthWith(2, 'CREATE DATABASE "test_db" WITH OWNER "test_user"');
	});

	it("should report a fatal error and close the connection when a query fails", async ({ cli }) => {
		writeFileSync(`${process.env.MAINSAIL_PATH_CONFIG}/core/.env`, environment);

		stub(Pg.Client.prototype, "connect");
		stub(Pg.Client.prototype, "query").rejectedValue(new Error("connection refused"));
		const end = stub(Pg.Client.prototype, "end");

		await assert.rejects(() => cli.withFlags({ force: true }).execute(Command), "connection refused");

		end.calledOnce();
	});
});
