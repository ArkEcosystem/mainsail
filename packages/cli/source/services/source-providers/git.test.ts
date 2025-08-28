import fs from "fs-extra/esm";
import { join } from "path";
import esmock from "esmock";
import { dirSync, setGracefulCleanup } from "tmp";
import { Contracts } from "@mainsail/test-runner";

import { describe } from "../../../../test-framework/source";
import { Git } from "./git";

let removeSyncStub: Contracts.Stub;
let execaSyncStub: Contracts.Stub;

const { Git: GitProxy } = await esmock(
	"./git",
	import.meta.url,
	{},
	{
		"fs-extra/esm": {
			removeSync: (...args) => removeSyncStub.call(...args),
		},
		execa: {
			execaSync: (...args) => execaSyncStub.call(...args),
		},
	},
);

describe<{
	dataPath: string;
	tempPath: string;
	source: Git;
	sourceMocked: Git;
}>("Git", ({ beforeEach, afterAll, it, assert, stub, stubFn }) => {
	beforeEach((context) => {
		removeSyncStub = stubFn();
		execaSyncStub = stubFn();

		context.dataPath = dirSync().name;
		context.tempPath = dirSync().name;

		context.source = new Git({ data: context.dataPath, temp: context.tempPath });
		context.sourceMocked = new GitProxy({ data: context.dataPath, temp: context.tempPath });
	});

	afterAll(() => setGracefulCleanup());

	it("#exists - should return true if the file exists", async ({ source }) => {
		assert.true(await source.exists("git@github.com:ArkEcosystem/utils.git"));
	});

	it("#exists - should return false if the file does not exists", async ({ source }) => {
		assert.false(await source.exists("does not exist"));
	});

	it("#install - should successfully install the plugin", async ({ sourceMocked, tempPath, dataPath }) => {
		// Arrange
		execaSyncStub = stubFn().callsFake(() => {
			fs.ensureDirSync(join(tempPath, "package"));
			fs.writeJSONSync(join(tempPath, "package", "package.json"), { name: "@mainsail/utils" });
		});

		// Act
		const repository = "git@github.com:ArkEcosystem/utils.git";
		await sourceMocked.install(repository);

		// Assert
		const packageName = "@mainsail/utils";
		const targetPath = `${dataPath}/${packageName}`;
		removeSyncStub.calledWith(targetPath);
		removeSyncStub.calledWith(join(tempPath, "package"));
		execaSyncStub.calledWith(`git`, ["clone", repository, join(tempPath, "package")]);
		execaSyncStub.calledWith(`pnpm`, ["install", "--production"], {
			cwd: join(dataPath, packageName),
		});
	});

	it("#update - should successfully update the plugin", async ({ sourceMocked, dataPath }) => {
		// Act
		const packageName = "@mainsail/utils";
		await sourceMocked.update(packageName);

		// Assert
		execaSyncStub.calledWith(`git`, ["reset", "--hard"], { cwd: join(dataPath, packageName) });
		execaSyncStub.calledWith(`git`, ["pull"], { cwd: join(dataPath, packageName) });
		execaSyncStub.calledWith(`pnpm`, ["install", "--production"], {
			cwd: join(dataPath, packageName),
		});
	});
});
