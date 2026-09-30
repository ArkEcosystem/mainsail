import { Identifiers } from "@mainsail/constants";
import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";
import { QueryFailedError } from "typeorm";

import { Identifiers as ApiDatabaseIdentifiers } from "./identifiers";
import { Migrations } from "./migrations";

describe<{
	app: Application;
	logger: any;
	dataSource: any;
	migrations: Migrations;
}>("Migrations", ({ it, beforeEach, assert, stub, spy }) => {
	beforeEach((context) => {
		context.logger = {
			debug: () => {},
			info: () => {},
		};

		context.dataSource = {
			manager: {
				query: async () => [{ statement_timeout: "3000ms" }],
			},
			runMigrations: async () => [],
			synchronize: async () => {},
		};

		context.app = new Application();
		// Application auto-binds itself as Identifiers.Application.Instance, but terminate is not defined.
		context.app.terminate = async () => {};
		context.app.bind(Identifiers.Services.Log.Service).toConstantValue(context.logger);
		context.app.bind(ApiDatabaseIdentifiers.DataSource).toConstantValue(context.dataSource);

		context.migrations = context.app.resolve(Migrations);
	});

	it("synchronizeEntities - resolves without throwing on success", async ({ migrations, dataSource }) => {
		const synchronize = spy(dataSource, "synchronize");

		await assert.resolves(() => migrations.synchronizeEntities());

		synchronize.calledOnce();
		synchronize.calledWith(false);
	});

	it("synchronizeEntities - swallows QueryFailedError with code 42P07 and logs debug", async ({
		migrations,
		dataSource,
		logger,
	}) => {
		const error = new QueryFailedError("q", [], new Error("duplicate table"));
		error["code"] = "42P07";
		stub(dataSource, "synchronize").rejectedValue(error);
		const debug = spy(logger, "debug");

		await assert.resolves(() => migrations.synchronizeEntities());

		debug.calledOnce();
		debug.calledWith("entities already synchronized");
	});

	it("synchronizeEntities - rethrows QueryFailedError with a different code", async ({
		migrations,
		dataSource,
		logger,
	}) => {
		const error = new QueryFailedError("q", [], new Error("other"));
		error["code"] = "42000";
		stub(dataSource, "synchronize").rejectedValue(error);
		const debug = spy(logger, "debug");

		await assert.rejects(() => migrations.synchronizeEntities());

		debug.neverCalled();
	});

	it("synchronizeEntities - rethrows a plain Error", async ({ migrations, dataSource }) => {
		const error = new Error("boom");
		stub(dataSource, "synchronize").rejectedValue(error);

		await assert.rejects(() => migrations.synchronizeEntities(), "boom");
	});

	it("runMigrations - sets timeout 0, runs migrations, restores timeout, logs names", async ({
		migrations,
		dataSource,
		logger,
	}) => {
		const calls: string[] = [];
		stub(dataSource.manager, "query").callsFake(async (sql: string) => {
			calls.push(sql);
			if (sql === "SHOW statement_timeout") {
				return [{ statement_timeout: "3000ms" }];
			}
			return [];
		});
		const runMigrations = stub(dataSource, "runMigrations").resolvedValue([{ name: "First" }, { name: "Second" }]);
		const info = spy(logger, "info");

		await assert.resolves(() => migrations.runMigrations());

		assert.equal(calls, [
			"SHOW statement_timeout",
			"SET statement_timeout = 0",
			"SET statement_timeout = '3000ms'",
		]);

		runMigrations.calledOnce();
		runMigrations.calledWith({ transaction: "all" });

		info.calledWith(">>> First");
		info.calledWith(">>> Second");
	});

	it("runMigrations - terminates app on error and still restores timeout in finally", async ({
		migrations,
		app,
		dataSource,
	}) => {
		const calls: string[] = [];
		stub(dataSource.manager, "query").callsFake(async (sql: string) => {
			calls.push(sql);
			if (sql === "SHOW statement_timeout") {
				return [{ statement_timeout: "5000ms" }];
			}
			return [];
		});
		const error = new Error("migration failed");
		stub(dataSource, "runMigrations").rejectedValue(error);
		const terminate = spy(app, "terminate");

		await assert.resolves(() => migrations.runMigrations());

		terminate.calledOnce();
		terminate.calledWith("failed to run migrations", error);

		// finally still restores the timeout
		assert.equal(calls, [
			"SHOW statement_timeout",
			"SET statement_timeout = 0",
			"SET statement_timeout = '5000ms'",
		]);
	});
});
