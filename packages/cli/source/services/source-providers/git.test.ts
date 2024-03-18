import fs from "fs-extra/esm";
import { join } from "path";
import { dirSync, setGracefulCleanup } from "tmp";

import { describe } from "../../../../test-framework/source";
import { execa } from "../../execa";
import { Git } from "./git";

describe<{
	dataPath: string;
	tempPath: string;
	source: Git;
}>("Git", ({ beforeEach, afterAll, it, assert, stub }) => {
	beforeEach((context) => {
		context.dataPath = dirSync().name;
		context.tempPath = dirSync().name;

		context.source = new Git({ data: context.dataPath, temp: context.tempPath });
	});

	afterAll(() => setGracefulCleanup());

	it("#exists - should return true if the file exists", async ({ source }) => {
		assert.true(await source.exists("git@github.com:ArkEcosystem/utils.git"));
	});

	it("#exists - should return false if the file does not exists", async ({ source }) => {
		assert.false(await source.exists("does not exist"));
	});

	// TODO: fix stub
	it.skip("#install - should successfully install the plugin", async ({ source, tempPath, dataPath }) => {
		// Arrange
		const removeSync = stub(fs, "removeSync");
		const spyOnExeca = stub(execa, "sync").callsFake(() => {
			fs.ensureDirSync(join(tempPath, "package"));
			fs.writeJSONSync(join(tempPath, "package", "package.json"), { name: "@mainsail/utils" });
		});

		// Act
		const repository = "git@github.com:ArkEcosystem/utils.git";
		await source.install(repository);

		// Assert
		const packageName = "@mainsail/utils";
		const targetPath = `${dataPath}/${packageName}`;
		removeSync.calledWith(targetPath);
		removeSync.calledWith(join(tempPath, "package"));
		spyOnExeca.calledWith(`git`, ["clone", repository, join(tempPath, "package")]);
		spyOnExeca.calledWith(`pnpm`, ["install", "--production"], {
			cwd: join(dataPath, packageName),
		});
	});

	// TODO: fix stub
	it.skip("#update - should successfully update the plugin", async ({ source, dataPath }) => {
		// Arrange
		const spyOnExeca = stub(execa, "sync");

		// Act
		const packageName = "@mainsail/utils";
		await source.update(packageName);

		// Assert
		spyOnExeca.calledWith(`git`, ["reset", "--hard"], { cwd: join(dataPath, packageName) });
		spyOnExeca.calledWith(`git`, ["pull"], { cwd: join(dataPath, packageName) });
		spyOnExeca.calledWith(`pnpm`, ["install", "--production"], {
			cwd: join(dataPath, packageName),
		});
	});
});
