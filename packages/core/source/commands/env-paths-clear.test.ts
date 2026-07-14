import type { Contracts } from "@mainsail/contracts";

import { Console } from "@mainsail/cli";
import { Identifiers } from "@mainsail/constants";
import { describe } from "@mainsail/test-runner";
import { readdirSync, rmSync, writeFileSync } from "fs";
import { ensureDirSync } from "fs-extra/esm";
import { join } from "path";
import { dirSync, setGracefulCleanup } from "tmp";

import { Command } from "./env-paths-clear";

describe<{
	cli: Console;
	paths: Contracts.Cli.Paths;
}>("EnvPathsClearCommand", ({ beforeEach, afterAll, it, assert, stub, spy, each }) => {
	const seed = (path: string): string => {
		ensureDirSync(path);
		writeFileSync(join(path, "file"), "content");

		return path;
	};

	beforeEach((context) => {
		context.cli = new Console();

		context.paths = {
			cache: seed(join(dirSync().name, "cache")),
			config: seed(join(dirSync().name, "config")),
			data: seed(join(dirSync().name, "data")),
			log: seed(join(dirSync().name, "log")),
			temp: seed(join(dirSync().name, "temp")),
		};

		stub(context.cli.app.get(Identifiers.Cli.Service.Environment), "getPaths").returnValue(context.paths);
	});

	afterAll(() => setGracefulCleanup());

	each(
		"should clear the %s path",
		async ({ context: { cli, paths }, dataset }) => {
			const log = spy(cli.app.get(Identifiers.Cli.Component.Log), "render");

			await cli.withFlags({ [dataset]: true }).execute(Command);

			for (const [name, path] of Object.entries(paths)) {
				assert.length(readdirSync(path), name === dataset ? 0 : 1);
			}

			log.calledOnce();
		},
		["data", "config", "cache", "log", "temp"],
	);

	each(
		"should clear the %s path even when all is set to false",
		async ({ context: { cli, paths }, dataset }) => {
			const log = spy(cli.app.get(Identifiers.Cli.Component.Log), "render");

			await cli.withFlags({ [dataset]: true, all: false }).execute(Command);

			for (const [name, path] of Object.entries(paths)) {
				assert.length(readdirSync(path), name === dataset ? 0 : 1);
			}

			log.calledOnce();
		},
		["data", "config", "cache", "log", "temp"],
	);

	it("should clear all paths with the all flag", async ({ cli, paths }) => {
		const log = spy(cli.app.get(Identifiers.Cli.Component.Log), "render");

		await cli.withFlags({ all: true }).execute(Command);

		for (const path of Object.values(paths)) {
			assert.length(readdirSync(path), 0);
		}

		log.calledTimes(5);
	});

	it("should not clear any path when the flags are explicitly false", async ({ cli, paths }) => {
		const log = spy(cli.app.get(Identifiers.Cli.Component.Log), "render");

		// --data=false / --all=false must NOT clear (regression: hasFlag treated presence as true).
		await cli.withFlags({ all: false, data: false }).execute(Command);

		for (const path of Object.values(paths)) {
			assert.length(readdirSync(path), 1);
		}

		log.neverCalled();
	});

	it("should clear the plugins path", async ({ cli, paths }) => {
		const plugins = seed(join(paths.data, "plugins"));

		await cli.withFlags({ plugins: true }).execute(Command);

		assert.length(readdirSync(plugins), 0);
		assert.length(readdirSync(paths.config), 1);
	});

	it("should clear the state-export path", async ({ cli, paths }) => {
		const stateExport = seed(join(paths.data, "state-export"));

		await cli.withFlags({ "state-export": true }).execute(Command);

		assert.length(readdirSync(stateExport), 0);
		// The seeded data file itself is untouched (state-export is a subdirectory clear).
		assert.true(readdirSync(paths.data).includes("file"));
	});

	it("should clear consensus database files", async ({ cli, paths }) => {
		const log = spy(cli.app.get(Identifiers.Cli.Component.Log), "render");

		writeFileSync(join(paths.data, "consensus-a.mdb"), "content");
		writeFileSync(join(paths.data, "consensus-b.mdb"), "content");

		await cli.withFlags({ consensusData: true }).execute(Command);

		assert.equal(readdirSync(paths.data), ["file"]);
		log.calledOnce();
	});

	it("should clear transaction pool database files", async ({ cli, paths }) => {
		writeFileSync(join(paths.data, "transaction-pool.mdb"), "content");

		await cli.withFlags({ txPoolData: true }).execute(Command);

		assert.equal(readdirSync(paths.data), ["file"]);
	});

	it("should do nothing when no database files match", async ({ cli, paths }) => {
		const log = spy(cli.app.get(Identifiers.Cli.Component.Log), "render");

		await cli.withFlags({ consensusData: true, txPoolData: true }).execute(Command);

		assert.equal(readdirSync(paths.data), ["file"]);
		log.neverCalled();
	});

	it("should skip paths that do not exist", async ({ cli, paths }) => {
		const log = spy(cli.app.get(Identifiers.Cli.Component.Log), "render");

		await cli.withFlags({ plugins: true }).execute(Command);

		assert.false(Object.values(paths).some((path) => readdirSync(path).length === 0));
		log.neverCalled();
	});

	it("should skip paths that are already empty", async ({ cli, paths }) => {
		rmSync(join(paths.data, "file"));

		const log = spy(cli.app.get(Identifiers.Cli.Component.Log), "render");

		await cli.withFlags({ data: true }).execute(Command);

		log.neverCalled();
	});
});
