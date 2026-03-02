import * as Exceptions from "@mainsail/exceptions";
import { join } from "path";
import esmock from "esmock";
import { dirSync, fileSync, setGracefulCleanup } from "tmp";
import type { Contracts } from "@mainsail/test-runner";

import { describe } from "@mainsail/test-runner";
import { File } from "./file";

let removeSyncStub: Contracts.Stub;
let execaSyncStub: Contracts.Stub;

const { File: FileProxy } = await esmock(
	"./file",
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
	temporaryPath: string;
	source: File;
	sourceMocked: File;
}>("File", ({ beforeEach, afterAll, it, assert, stub, stubFn }) => {
	beforeEach((context) => {
		removeSyncStub = stubFn();
		execaSyncStub = stubFn();

		context.dataPath = dirSync().name;
		context.temporaryPath = dirSync().name;

		context.source = new File({ data: context.dataPath, temp: context.temporaryPath });
		context.sourceMocked = new FileProxy({ data: context.dataPath, temp: context.temporaryPath });
	});

	afterAll(() => setGracefulCleanup());

	it("#exists - should return true if the file exists", async ({ source }) => {
		assert.true(await source.exists(fileSync().name));
	});

	it("#exists - should return false if the file does not exists", async ({ source }) => {
		assert.false(await source.exists("does not exist"));
	});

	it("#install - should successfully install the plugin", async ({ sourceMocked, dataPath, temporaryPath }) => {
		// Arrange
		const fileName: string = join(import.meta.dirname, "../../../test/files", "utils-0.9.1.tgz");

		// Act
		await sourceMocked.install(fileName);

		// Assert
		const packageName = "@arkecosystem/utils";
		removeSyncStub.calledTimes(3);
		removeSyncStub.calledWith(join(temporaryPath, "package")); // Remove package
		removeSyncStub.calledWith(join(dataPath, packageName)); // Remove installed package
		execaSyncStub.calledOnce();
		execaSyncStub.calledWith(`pnpm`, ["install", "--production"], {
			cwd: join(dataPath, packageName),
		});
	});

	it("#install - should throw error if .tgz doesn't contains package folder", async ({ source }) => {
		// Arrange
		const fileName: string = join(import.meta.dirname, "../../../test/files", "invalid-utils-0.9.1.tgz");
		// Act
		await assert.rejects(() => source.install(fileName), Exceptions.MissingPackageFolder);
	});

	it("#install - should throw error if .tgz doesn't contains package.json", async ({ source }) => {
		// Arrange
		const fileName: string = join(import.meta.dirname, "../../../test/files", "missing-utils-0.9.1.tgz");

		// Act
		await assert.rejects(() => source.install(fileName), Exceptions.InvalidPackageJson);
	});

	it("#update - should successfully update the plugin", async ({ sourceMocked, dataPath, temporaryPath }) => {
		// Arrange
		const fileName: string = join(import.meta.dirname, "../../../test/files", "utils-0.9.1.tgz");

		// Act
		await sourceMocked.update(fileName);

		// Assert
		const packageName = "@arkecosystem/utils";
		removeSyncStub.calledWith(join(dataPath, packageName));
		removeSyncStub.calledWith(join(temporaryPath, "package"));
		execaSyncStub.calledWith(`pnpm`, ["install", "--production"], {
			cwd: join(dataPath, packageName),
		});
	});
});
