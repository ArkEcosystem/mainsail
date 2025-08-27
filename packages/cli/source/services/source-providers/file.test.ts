import { Exceptions } from "@mainsail/contracts";
import fs from "fs-extra/esm";
import { join } from "path";
import esmock from "esmock";
import { execaSync } from "execa";
import { removeSync } from "fs-extra/esm";
import { dirSync, fileSync, setGracefulCleanup } from "tmp";
import { Contracts } from "@mainsail/test-runner";

import { describe } from "../../../../test-framework/source";
import { execa } from "../../execa";
import { File } from "./file";

let removeSyncStub: Contracts.Stub;
let execaSyncStub: Contracts.Stub;

const { File: FileProxy } = await esmock("./file",import.meta.url, {}, {
	"fs-extra/esm": {
		removeSync: (...args) => removeSyncStub.call(...args),
	},
	"execa": {
		execaSync: (...args) => execaSyncStub.call(...args),
	},
});


describe<{
	dataPath: string;
	temporaryPath: string;
	source: File;
}>("File", ({ beforeEach, afterAll, it, assert, stub, stubFn }) => {
	beforeEach((context) => {
		removeSyncStub = stubFn();
		execaSyncStub = stubFn();

		context.dataPath = dirSync().name;
		context.temporaryPath = dirSync().name;

		context.source = new FileProxy({ data: context.dataPath, temp: context.temporaryPath });
	});

	afterAll(() => setGracefulCleanup());

	it("#exists - should return true if the file exists", async ({ source }) => {
		assert.true(await source.exists(fileSync().name));
	});

	it("#exists - should return false if the file does not exists", async ({ source }) => {
		assert.false(await source.exists("does not exist"));
	});

	it("#install - should successfully install the plugin", async ({ source, dataPath, temporaryPath }) => {
		// Arrange
		const fileName: string = join(import.meta.dirname, "../../../test/files", "utils-0.9.1.tgz");


		// Act
		await source.install(fileName);

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

	it.only("#install - should throw error if .tgz doesn't contains package folder", async ({ source }) => {
		// Arrange
		const fileName: string = join(import.meta.dirname, "../../../test/files", "invalid-utils-0.9.1.tgz");

		removeSyncStub = stubFn().callsFake((path) => removeSync(path));
		execaSyncStub = stubFn().callsFake((path) => execaSync(path));
		// Act
		await assert.rejects(() => source.install(fileName), Exceptions.MissingPackageFolder);
	});

	it("#install - should throw error if .tgz doesn't contains package.json", async ({ source }) => {
		// Arrange
		const fileName: string = join(import.meta.dirname, "../../../test/files", "missing-utils-0.9.1.tgz");

		// Act
		await assert.rejects(() => source.install(fileName), Exceptions.InvalidPackageJson);
	});

	// TODO: fix stub
	it.skip("#update - should successfully update the plugin", async ({ source, dataPath, temporaryPath }) => {
		// Arrange
		const fileName: string = join(import.meta.dirname, "../../../test/files", "utils-0.9.1.tgz");

		const removeSync = stub(fs, "removeSync");
		const spyOnExeca = stub(execa, "sync");

		// Act
		await source.update(fileName);

		// Assert
		const packageName = "@arkecosystem/utils";
		removeSync.calledWith(join(dataPath, packageName));
		removeSync.calledWith(join(temporaryPath, "package"));
		spyOnExeca.calledWith(`pnpm`, ["install", "--production"], {
			cwd: join(dataPath, packageName),
		});
	});
});
