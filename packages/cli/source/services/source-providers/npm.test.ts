import { readFileSync } from "fs";
import { join, resolve } from "path";
import esmock from "esmock";
import { dirSync, setGracefulCleanup } from "tmp";
import type { Contracts } from "@mainsail/test-runner";

import { describe } from "../../../../test-framework/source";
import { NPM } from "./npm";

let removeSyncStub: Contracts.Stub;
let moveSyncStub: Contracts.Stub;
let execaSyncStub: Contracts.Stub;

const { NPM: NPMProxy } = await esmock(
	"./npm",
	import.meta.url,
	{},
	{
		"fs-extra/esm": {
			removeSync: (...args) => removeSyncStub.call(...args),
			moveSync: (...args) => moveSyncStub.call(...args),
		},
		execa: {
			execaSync: (...args) => execaSyncStub.call(...args),
		},
	},
);

describe<{
	dataPath: string;
	tempPath: string;
	source: NPM;
	sourceMocked: NPM;
}>("NPM", ({ beforeEach, afterEach, afterAll, it, assert, spy, stub, nock, stubFn }) => {
	beforeEach((context) => {
		removeSyncStub = stubFn();
		moveSyncStub = stubFn();
		execaSyncStub = stubFn();

		context.dataPath = dirSync().name;
		context.tempPath = dirSync().name;

		context.source = new NPM({ data: context.dataPath, temp: context.tempPath });
		context.sourceMocked = new NPMProxy({ data: context.dataPath, temp: context.tempPath });

		nock.cleanAll();
	});

	afterEach(() => nock.enableNetConnect());

	afterAll(() => {
		setGracefulCleanup();
	});

	it("#exists - should return true if the file exists", async ({ source }) => {
		nock.fake(/.*/)
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
		nock.fake(/.*/)
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
		nock.fake(/.*/)
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

	it("#update - should successfully install the plugin", async ({ sourceMocked, tempPath, dataPath }) => {
		nock.fake(/.*/)
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

		nock.fake(/.*/)
			.get("/@arkecosystem/utils/-/utils-0.9.1.tgz")
			.reply(
				200,
				readFileSync(resolve(new URL(".", import.meta.url).pathname, "../../../test/files", "utils-0.9.1.tgz")),
			);

		// Act
		const packageName = "@arkecosystem/utils";
		await sourceMocked.update(packageName);

		// Assert
		const pathPlugin = `${dataPath}/${packageName}`;
		removeSyncStub.calledWith(pathPlugin);
		// ensureFileSync.calledWith(`${tempPath}/${packageName}.tgz`);
		moveSyncStub.calledWith(`${tempPath}/package`, pathPlugin);
		removeSyncStub.calledWith(`${tempPath}/${packageName}.tgz`);
		execaSyncStub.calledWith(`pnpm`, ["install", "--production"], {
			cwd: join(dataPath, packageName),
		});
	});
});
