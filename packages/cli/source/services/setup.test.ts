import { describe } from "@mainsail/test-runner";
import { execa } from "../execa";
import { Setup } from "./setup";
import { Console } from "../test/index.js";

describe<{
	setup: Setup;
}>("Setup", ({ beforeAll, it, stub, assert }) => {
	beforeAll((context) => {
		const cli = new Console();

		context.setup = cli.app.resolve(Setup);
	});

	it("#isGlobal - should return true if installed globally", ({ setup }) => {
		// Arrange...
		const spySync = stub(execa, "sync").returnValue({
			exitCode: 0,
			stdout: process.argv[1].slice(0, 10), // Slice first part so simulate begins with
		});

		// Act...
		const isGlobal = setup.isGlobal();

		// Assert...
		assert.true(isGlobal);
		spySync.calledOnce();
		spySync.calledWith("pnpm root -g dir", { shell: true });
	});

	it("#isGlobal - should return false for test suite", ({ setup }) => {
		// Arrange...
		const globalDir = "/Users/username/Library/pnpm/global/5/node_modules";
		const spySync = stub(execa, "sync").returnValue({
			exitCode: 0,
			stdout: globalDir,
		});

		// Act...
		const isGlobal = setup.isGlobal();

		// Assert...
		assert.false(isGlobal);
		spySync.calledOnce();
		spySync.calledWith("pnpm root -g dir", { shell: true });
	});

	it("#isGlobal - should return false if pnpm command fails", ({ setup }) => {
		// Arrange...
		const spySync = stub(execa, "sync").returnValue({
			exitCode: 1,
			stdout: "",
		});

		// Act...
		const isGlobal = setup.isGlobal();

		// Assert...
		assert.false(isGlobal);
		spySync.calledOnce();
		spySync.calledWith("pnpm root -g dir", { shell: true });
	});

	it("#getEntrypoint - should return entrypoint", ({ setup }) => {
		assert.string(setup.getEntrypoint());
		assert.equal(setup.getEntrypoint(), process.argv[1]);
	});

	it("#getGlobalEntrypoint - should return package global entrypoint", ({ setup }) => {
		// Arrange...
		const globalDir = "/Users/username/Library/pnpm/global/5/node_modules";
		const packageId = "package-id";
		const spySync = stub(execa, "sync").returnValue({
			exitCode: 0,
			stdout: globalDir,
		});

		// Act...
		const entrypoint = setup.getGlobalEntrypoint(packageId);

		// Assert...
		assert.equal(entrypoint, `${globalDir}/${packageId}/bin/run.js`);
		spySync.calledOnce();
		spySync.calledWith("pnpm root -g dir", { shell: true });
	});

	it("#getGlobalEntrypoint - should throw if pnpm command fails", ({ setup }) => {
		// Arrange...
		const packageId = "package-id";
		const spySync = stub(execa, "sync").returnValue({
			exitCode: 1,
			stdout: "",
		});

		// Act...
		assert.throws(() => setup.getGlobalEntrypoint(packageId), "Cannot determine global pnpm dir");

		// Assert...
		spySync.calledOnce();
		spySync.calledWith("pnpm root -g dir", { shell: true });
	});
});
