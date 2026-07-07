import type { Providers } from "@mainsail/kernel";

import { Identifiers as ApiDatabaseIdentifiers, Pg, ServiceProvider } from "@mainsail/api-database";
import { Console } from "@mainsail/cli";
import { describe } from "@mainsail/test-runner";
import { writeFileSync } from "fs";
import { ensureDirSync } from "fs-extra";
import prompts from "prompts";
import { dirSync, setGracefulCleanup } from "tmp";

import { apiPackageJson } from "../test/fixtures";
import { Command } from "./database-reset";

describe<{
	cli: Console;
	dataSource: { synchronize: (dropBeforeSync: boolean) => Promise<void> };
	migrations: { runMigrations: () => Promise<void> };
}>("DatabaseResetCommand", ({ beforeEach, afterAll, it, assert, stub, spy }) => {
	const environment = [
		"MAINSAIL_DB_HOST=localhost",
		"MAINSAIL_DB_PORT=5432",
		"MAINSAIL_DB_DATABASE=test_db",
		"MAINSAIL_DB_USERNAME=test_user",
		"MAINSAIL_DB_PASSWORD=password",
	].join("\n");

	beforeEach((context) => {
		process.env.MAINSAIL_PATH_CONFIG = dirSync().name;

		ensureDirSync(`${process.env.MAINSAIL_PATH_CONFIG}/api`);

		context.cli = new Console(true, apiPackageJson);

		context.dataSource = { synchronize: async () => {} };
		context.migrations = { runMigrations: async () => {} };
		context.cli.app.bind(ApiDatabaseIdentifiers.DataSource).toConstantValue(context.dataSource);
		context.cli.app.bind(ApiDatabaseIdentifiers.Migrations).toConstantValue(context.migrations);
	});

	afterAll(() => setGracefulCleanup());

	it("should fail if the environment file does not exist", async ({ cli }) => {
		await assert.rejects(
			() => cli.withFlags({ force: true }).execute(Command),
			`No environment file found at ${process.env.MAINSAIL_PATH_CONFIG}/api/.env.`,
		);
	});

	it("should fail if a database variable is missing from the environment file", async ({ cli }) => {
		writeFileSync(`${process.env.MAINSAIL_PATH_CONFIG}/api/.env`, "MAINSAIL_DB_HOST=localhost");

		await assert.rejects(
			() => cli.withFlags({ force: true }).execute(Command),
			`The "MAINSAIL_DB_DATABASE" doesn't exist.`,
		);
	});

	it("should abort without resetting when the confirmation is declined", async ({ cli }) => {
		writeFileSync(`${process.env.MAINSAIL_PATH_CONFIG}/api/.env`, environment);

		const register = stub(ServiceProvider.prototype, "register");
		const connect = stub(Pg.Client.prototype, "connect");

		prompts.inject([false]);

		await cli.execute(Command);

		register.neverCalled();
		connect.neverCalled();
	});

	it("should resynchronize the database and run migrations when confirmed", async ({
		cli,
		dataSource,
		migrations,
	}) => {
		writeFileSync(`${process.env.MAINSAIL_PATH_CONFIG}/api/.env`, environment);

		const register = stub(ServiceProvider.prototype, "register");
		const dispose = stub(ServiceProvider.prototype, "dispose");
		const setConfig = spy(ServiceProvider.prototype, "setConfig");
		stub(Pg.Client.prototype, "connect");
		const query = stub(Pg.Client.prototype, "query");
		const end = stub(Pg.Client.prototype, "end");
		const synchronize = spy(dataSource, "synchronize");
		const runMigrations = spy(migrations, "runMigrations");

		prompts.inject([true]);

		await cli.execute(Command);

		register.calledOnce();
		query.calledOnce();
		end.calledOnce();
		synchronize.calledWith(true);
		runMigrations.calledOnce();
		dispose.calledOnce();

		const pluginConfiguration = setConfig.getCallArgs(0)[0] as Providers.PluginConfiguration;
		assert.true(pluginConfiguration.getRequired("enabled"));
		assert.equal(pluginConfiguration.getRequired<Record<string, unknown>>("database").database, "test_db");
		assert.equal(pluginConfiguration.getRequired<Record<string, unknown>>("database").username, "test_user");
	});

	it("should report a fatal error and dispose the database provider when a task fails", async ({
		cli,
		dataSource,
	}) => {
		writeFileSync(`${process.env.MAINSAIL_PATH_CONFIG}/api/.env`, environment);

		stub(ServiceProvider.prototype, "register");
		const dispose = stub(ServiceProvider.prototype, "dispose");
		stub(Pg.Client.prototype, "connect");
		stub(Pg.Client.prototype, "query");
		stub(Pg.Client.prototype, "end");
		stub(dataSource, "synchronize").rejectedValue(new Error("synchronize failed"));

		await assert.rejects(() => cli.withFlags({ force: true }).execute(Command), "synchronize failed");

		dispose.calledOnce();
	});
});
