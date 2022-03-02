import { join, resolve } from "path";
import fs from "fs-extra";
import nock from "nock";
import { dirSync, setGracefulCleanup } from "tmp";

import { describe } from "../../../../core-test-framework";
import { execa } from "../../execa";
import { NPM } from "./npm";

describe<{
	dataPath: string;
	tempPath: string;
	source: NPM;
}>("NPM", ({ beforeEach, afterEach, afterAll, it, assert, spy, stub }) => {
	beforeEach((context) => {
		context.dataPath = dirSync().name;
		context.tempPath = dirSync().name;

		context.source = new NPM({ data: context.dataPath, temp: context.tempPath });

		nock.cleanAll();
	});

	afterEach(() => nock.enableNetConnect());

	afterAll(() => {
		setGracefulCleanup();
	});

	it("#exists - should return true if the file exists", async ({ source }) => {
		nock(/.*/)
			.get("/@arkecosystem/utils")
			.reply(200, {
				"dist-tags": {
					latest: "0.9.1",
				},
				name: "@arkecosystem/utils",
				versions: {
					"0.9.1": {
						dist: {
							tarball: "https://registry.npmjs.org/@arkecosystem/utils/-/utils-0.9.1.tgz",
						},
						name: "@arkecosystem/utils",
						version: "0.9.1",
					},
				},
			});

		assert.true(await source.exists("@arkecosystem/utils"));
	});

	it("#exists - should return true if the file by version exists", async ({ source }) => {
		nock(/.*/)
			.get("/@arkecosystem/utils")
			.reply(200, {
				"dist-tags": {
					latest: "0.9.1",
				},
				name: "@arkecosystem/utils",
				versions: {
					"0.9.1": {
						dist: {
							tarball: "https://registry.npmjs.org/@arkecosystem/utils/-/utils-0.9.1.tgz",
						},
						name: "@arkecosystem/utils",
						version: "0.9.1",
					},
				},
			});

		assert.true(await source.exists("@arkecosystem/utils", "0.9.1"));
	});

	it("#exists - should return false if the file by version doesn't exists", async ({ source }) => {
		nock(/.*/)
			.get("/@arkecosystem/utils")
			.reply(200, {
				"dist-tags": {
					latest: "0.9.1",
				},
				name: "@arkecosystem/utils",
				versions: {
					"0.9.1": {
						dist: {
							tarball: "https://registry.npmjs.org/@arkecosystem/utils/-/utils-0.9.1.tgz",
						},
						name: "@arkecosystem/utils",
						version: "0.9.1",
					},
				},
			});

		assert.false(await source.exists("@arkecosystem/utils", "0.5.5"));
	});

	it("#exists - should return false if the file does not exists", async ({ source }) => {
		assert.false(await source.exists("does not exist"));
	});

	it("#update - should successfully install the plugin", async ({ source, tempPath, dataPath }) => {
		nock(/.*/)
			.get("/@arkecosystem/utils")
			.reply(200, {
				"dist-tags": {
					latest: "0.9.1",
				},
				name: "@arkecosystem/utils",
				versions: {
					"0.9.1": {
						dist: {
							tarball: "https://registry.npmjs.org/@arkecosystem/utils/-/utils-0.9.1.tgz",
						},
						name: "@arkecosystem/utils",
						version: "0.9.1",
					},
				},
			});

		nock(/.*/)
			.get("/@arkecosystem/utils/-/utils-0.9.1.tgz")
			.reply(200, fs.readFileSync(resolve(__dirname, "../../../test/files", "utils-0.9.1.tgz")));

		// Arrange
		const removeSync = spy(fs, "removeSync");
		const ensureFileSync = spy(fs, "ensureFileSync");
		const moveSync = spy(fs, "moveSync");
		const spyOnExeca = stub(execa, "sync");

		// Act
		const packageName = "@arkecosystem/utils";
		await source.update(packageName);

		// Assert
		const pathPlugin = `${dataPath}/${packageName}`;
		removeSync.calledWith(pathPlugin);
		ensureFileSync.calledWith(`${tempPath}/${packageName}.tgz`);
		removeSync.calledWith(pathPlugin);
		moveSync.calledWith(`${tempPath}/package`, pathPlugin);
		removeSync.calledWith(pathPlugin);
		removeSync.calledWith(`${tempPath}/${packageName}.tgz`);
		spyOnExeca.calledWith(`yarn`, ["install", "--production"], {
			cwd: join(dataPath, packageName),
		});
	});
});
