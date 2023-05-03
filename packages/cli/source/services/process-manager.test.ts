import { Console, describe } from "../../../core-test-framework";
import { ProcessDescription } from "../contracts";
import { execa } from "../execa";
import { ProcessManager } from "./process-manager";

describe<{
	processManager: ProcessManager;
}>("ProcessManager", ({ beforeAll, it, stub, assert }) => {
	beforeAll((context) => {
		const cli = new Console();

		context.processManager = cli.app.resolve(ProcessManager);
	});

	it("#list - should return an empty array if stdout is empty", ({ processManager }) => {
		// Arrange...
		const spySync = stub(execa, "sync").returnValue({
			failed: false,
			stderr: undefined,
			stdout: null,
		});

		// Act...
		const processes: ProcessDescription[] | undefined = processManager.list();

		// Assert...
		assert.array(processes);
		assert.empty(processes);
		spySync.calledWith("pm2 jlist", { shell: true });
	});

	it("#list - should return an empty array if stdout is empty after trimming", ({ processManager }) => {
		// Arrange...
		const spySync = stub(execa, "sync").returnValue({
			failed: false,
			stderr: undefined,
			stdout: "\n",
		});

		// Act...
		const processes: ProcessDescription[] | undefined = processManager.list();

		// Assert...
		assert.array(processes);
		assert.empty(processes);
		spySync.calledWith("pm2 jlist", { shell: true });
	});

	it("#list - should return an empty array if stdout is invalid JSON", ({ processManager }) => {
		// Arrange...
		const spySync = stub(execa, "sync").returnValue({
			failed: false,
			stderr: undefined,
			stdout: "{",
		});

		// Act...
		const processes: ProcessDescription[] | undefined = processManager.list();

		// Assert...
		assert.array(processes);
		assert.empty(processes);
		spySync.calledWith("pm2 jlist", { shell: true });
	});

	it("#list - should return an empty array if an exception is thrown", ({ processManager }) => {
		// Arrange...
		const spySync = stub(execa, "sync").callsFake(() => {
			throw new Error("Whoops");
		});

		// Act...
		const processes: ProcessDescription[] | undefined = processManager.list();

		// Assert...
		assert.array(processes);
		assert.empty(processes);
		spySync.calledWith("pm2 jlist", { shell: true });
	});

	it("#list - should return an array if stdout is valid JSON", ({ processManager }) => {
		// Arrange...
		const spySync = stub(execa, "sync").returnValue({
			failed: false,
			stderr: undefined,
			stdout: '[{ "key": "value" }]',
		});

		// Act...
		const processes: ProcessDescription[] | undefined = processManager.list();

		// Assert...
		assert.equal(processes, [{ key: "value" }]);
		spySync.calledWith("pm2 jlist", { shell: true });
	});

	it("#describe - should return an object if the process exists", ({ processManager }) => {
		// Arrange...
		const spySync = stub(execa, "sync").returnValue({
			failed: false,
			stderr: undefined,
			stdout: '[{ "id": "stub", "pm2_env": { "status": "unknown" } }]',
		});

		// Act...
		const process: ProcessDescription | undefined = processManager.describe("stub");

		// Assert...
		assert.object(process);
		spySync.calledWith("pm2 jlist", { shell: true });
	});

	it("#describe - should return undefined if the process does not exist", ({ processManager }) => {
		// Arrange...
		const spySync = stub(execa, "sync").returnValue({
			failed: false,
			stderr: undefined,
			stdout: '[{ "id": "stub-other", "pm2_env": { "status": "unknown" } }]',
		});

		// Act...
		const process: ProcessDescription | undefined = processManager.describe("stub");

		// Assert...
		assert.undefined(process);
		spySync.calledWith("pm2 jlist", { shell: true });
	});

	it("#describe - should return undefined if stdout is an empty array", ({ processManager }) => {
		// Arrange...
		const spySync = stub(execa, "sync").returnValue({
			failed: false,
			stderr: undefined,
			stdout: "[]",
		});

		// Act...
		const process: ProcessDescription | undefined = processManager.describe("stub");

		// Assert...
		assert.undefined(process);
		spySync.calledWith("pm2 jlist", { shell: true });
	});

	it("#describe - return undefined if an exception is thrown", ({ processManager }) => {
		// Arrange...
		const spySync = stub(execa, "sync").callsFake(() => {
			throw new Error("Whoops");
		});

		// Act...
		const process: ProcessDescription | undefined = processManager.describe("stub");

		// Assert...
		assert.undefined(process);
		spySync.calledWith("pm2 jlist", { shell: true });
	});

	it("#start - should be OK if failed is false", ({ processManager }) => {
		// Arrange...
		const spySync = stub(execa, "sync").returnValue({
			failed: false,
			stderr: undefined,
			stdout: null,
		});

		// Act...
		const { failed } = processManager.start(
			{
				script: "stub.js",
			},
			{ name: "stub" },
		);

		// Assert...
		assert.false(failed);
		spySync.calledWith("pm2 start stub.js --name='stub'", { shell: true });
	});

	it("#start - should respect the given node_args", ({ processManager }) => {
		// Arrange...
		const spySync = stub(execa, "sync").returnValue({
			failed: false,
			stderr: undefined,
			stdout: null,
		});

		// Act...
		const { failed } = processManager.start(
			{
				node_args: { max_old_space_size: 500 },
				script: "stub.js",
			},
			{ name: "stub" },
		);

		// Assert...
		assert.false(failed);
		spySync.calledWith("pm2 start stub.js --node-args=\"--max_old_space_size=500\" --name='stub'", { shell: true });
	});

	it("#start - should respect the given args", ({ processManager }) => {
		// Arrange...
		const spySync = stub(execa, "sync").returnValue({
			failed: false,
			stderr: undefined,
			stdout: null,
		});

		// Act...
		const { failed } = processManager.start(
			{
				args: "core:run --daemon",
				script: "stub.js",
			},
			{ name: "stub" },
		);

		// Assert...
		assert.false(failed);
		spySync.calledWith("pm2 start stub.js --name='stub' -- core:run --daemon", {
			shell: true,
		});
	});

	it("#start - should ignore the flags if they are undefined", ({ processManager }) => {
		// Arrange...
		const spySync = stub(execa, "sync").returnValue({
			failed: false,
			stderr: undefined,
			stdout: null,
		});

		// Act...
		const { failed } = processManager.start({
			script: "stub.js",
		});

		// Assert...
		assert.false(failed);
		spySync.calledWith("pm2 start stub.js", { shell: true });
	});

	it("#stop - should be OK if failed is false", ({ processManager }) => {
		// Arrange...
		const spySync = stub(execa, "sync").returnValue({
			failed: false,
			stderr: undefined,
			stdout: null,
		});

		// Act...
		const { failed } = processManager.stop("stub");

		// Assert...
		assert.false(failed);
		spySync.calledWith("pm2 stop stub", { shell: true });
	});

	it("#stop - should respect the given flags", ({ processManager }) => {
		// Arrange...
		const spySync = stub(execa, "sync").returnValue({
			failed: false,
			stderr: undefined,
			stdout: null,
		});

		// Act...
		const { failed } = processManager.stop("stub", { key: "value" });

		// Assert...
		assert.false(failed);
		spySync.calledWith("pm2 stop stub --key='value'", { shell: true });
	});

	it("#restart - should be OK if failed is false", ({ processManager }) => {
		// Arrange...
		const spySync = stub(execa, "sync").returnValue({
			failed: false,
			stderr: undefined,
			stdout: null,
		});

		// Act...
		const { failed } = processManager.restart("stub");

		// Assert...
		assert.false(failed);
		spySync.calledWith("pm2 restart stub --update-env", { shell: true });
	});

	it("#restart - should respect the given flags", ({ processManager }) => {
		// Arrange...
		const spySync = stub(execa, "sync").returnValue({
			failed: false,
			stderr: undefined,
			stdout: null,
		});

		// Act...
		const { failed } = processManager.restart("stub", { key: "value" });

		// Assert...
		assert.false(failed);
		spySync.calledWith("pm2 restart stub --key='value'", { shell: true });
	});

	it("#restart - should ignore the flags if they are empty", ({ processManager }) => {
		// Arrange...
		const spySync = stub(execa, "sync").returnValue({
			failed: false,
			stderr: undefined,
			stdout: null,
		});

		// Act...
		const { failed } = processManager.restart("stub", {});

		// Assert...
		assert.false(failed);
		spySync.calledWith("pm2 restart stub", { shell: true });
	});

	it("#reload - should reload", ({ processManager }) => {
		// Arrange...
		const spySync = stub(execa, "sync").returnValue({
			failed: false,
			stderr: undefined,
			stdout: null,
		});

		// Act...
		const { failed } = processManager.reload("stub");

		// Assert...
		assert.false(failed);
		spySync.calledWith("pm2 reload stub", { shell: true });
	});

	it("#reset - should reset", ({ processManager }) => {
		// Arrange...
		const spySync = stub(execa, "sync").returnValue({
			failed: false,
			stderr: undefined,
			stdout: null,
		});

		// Act...
		const { failed } = processManager.reset("stub");

		// Assert...
		assert.false(failed);
		spySync.calledWith("pm2 reset stub", { shell: true });
	});

	it("#delete - should delete", ({ processManager }) => {
		// Arrange...
		const spySync = stub(execa, "sync").returnValue({
			failed: false,
			stderr: undefined,
			stdout: null,
		});

		// Act...
		const { failed } = processManager.delete("stub");

		// Assert...
		assert.false(failed);
		spySync.calledWith("pm2 delete stub", { shell: true });
	});

	it("#flush - should flush", ({ processManager }) => {
		// Arrange...
		const spySync = stub(execa, "sync").returnValue({
			failed: false,
			stderr: undefined,
			stdout: null,
		});

		// Act...
		const { failed } = processManager.flush("stub");

		// Assert...
		assert.false(failed);
		spySync.calledWith("pm2 flush", { shell: true });
	});

	it("#reloadLogs - should reload logs", ({ processManager }) => {
		// Arrange...
		const spySync = stub(execa, "sync").returnValue({
			failed: false,
			stderr: undefined,
			stdout: null,
		});

		// Act...
		const { failed } = processManager.reloadLogs();

		// Assert...
		assert.false(failed);
		spySync.calledWith("pm2 reloadLogs", { shell: true });
	});

	it("#ping - should ping", ({ processManager }) => {
		// Arrange...
		const spySync = stub(execa, "sync").returnValue({
			failed: false,
			stderr: undefined,
			stdout: null,
		});

		// Act...
		const { failed } = processManager.ping();

		// Assert...
		assert.false(failed);
		spySync.calledWith("pm2 ping", { shell: true });
	});

	it("#update - should update", ({ processManager }) => {
		// Arrange...
		const spySync = stub(execa, "sync").returnValue({
			failed: false,
			stderr: undefined,
			stdout: null,
		});

		// Act...
		const { failed } = processManager.update();

		// Assert...
		assert.false(failed);
		spySync.calledWith("pm2 update", { shell: true });
	});

	it("#trigger - should trigger", async ({ processManager }) => {
		// Arrange...
		const spyExeca = stub(execa, "run").resolvedValue({
			failed: false,
			stderr: undefined,
			stdout: null,
		});

		// Act...
		const { failed } = await processManager.trigger("ark-core", "module.name", "params");

		// Assert...
		assert.false(failed);
		spyExeca.calledWith("pm2 trigger ark-core module.name params", { shell: true });
	});

	it("#status - should return the status if the process exists", ({ processManager }) => {
		// Arrange...
		const spySync = stub(execa, "sync").returnValue({
			failed: false,
			stderr: undefined,
			stdout: '[{ "id": "stub", "pm2_env": { "status": "online" } }]',
		});

		// Act...
		const status = processManager.status("stub");

		// Assert...
		assert.equal(status, "online");
		spySync.calledWith("pm2 jlist", { shell: true });
	});

	it("#status - return undefined if an exception is thrown", ({ processManager }) => {
		// Arrange...
		const spySync = stub(execa, "sync").callsFake(() => {
			throw new Error("Whoops");
		});

		// Act...
		const status = processManager.status("stub");

		// Assert...
		assert.undefined(status);
		spySync.calledWith("pm2 jlist", { shell: true });
	});

	it("#status - return undefined if process doesn't exists", ({ processManager }) => {
		// Arrange...
		const spySync = stub(execa, "sync").returnValue({
			failed: false,
			stderr: undefined,
			stdout: '[{ "id": "stub-other", "pm2_env": { "status": "online" } }]',
		});

		// Act...
		const status = processManager.status("stub");

		// Assert...
		assert.undefined(status);
		spySync.calledWith("pm2 jlist", { shell: true });
	});

	it("#isOnline - should return true", ({ processManager }) => {
		// Arrange...
		const spySync = stub(execa, "sync").returnValue({
			failed: false,
			stderr: undefined,
			stdout: '[{ "id": "stub", "pm2_env": { "status": "online" } }]',
		});

		// Act...
		const status = processManager.isOnline("stub");

		// Assert...
		assert.true(status);
		spySync.calledWith("pm2 jlist", { shell: true });
	});

	it("#isStopped - should return true", ({ processManager }) => {
		// Arrange...
		const spySync = stub(execa, "sync").returnValue({
			failed: false,
			stderr: undefined,
			stdout: '[{ "id": "stub", "pm2_env": { "status": "stopped" } }]',
		});

		// Act...
		const status = processManager.isStopped("stub");

		// Assert...
		assert.true(status);
		spySync.calledWith("pm2 jlist", { shell: true });
	});

	it("#isStopping - should return true", ({ processManager }) => {
		// Arrange...
		const spySync = stub(execa, "sync").returnValue({
			failed: false,
			stderr: undefined,
			stdout: '[{ "id": "stub", "pm2_env": { "status": "stopping" } }]',
		});

		// Act...
		const status = processManager.isStopping("stub");

		// Assert...
		assert.true(status);
		spySync.calledWith("pm2 jlist", { shell: true });
	});

	it("#isWaiting - shoudl return true", ({ processManager }) => {
		// Arrange...
		const spySync = stub(execa, "sync").returnValue({
			failed: false,
			stderr: undefined,
			stdout: '[{ "id": "stub", "pm2_env": { "status": "waiting restart" } }]',
		});

		// Act...
		const status = processManager.isWaiting("stub");

		// Assert...
		assert.true(status);
		spySync.calledWith("pm2 jlist", { shell: true });
	});

	it("#isLaunching - shoudl return true", ({ processManager }) => {
		// Arrange...
		const spySync = stub(execa, "sync").returnValue({
			failed: false,
			stderr: undefined,
			stdout: '[{ "id": "stub", "pm2_env": { "status": "launching" } }]',
		});

		// Act...
		const status = processManager.isLaunching("stub");

		// Assert...
		assert.true(status);
		spySync.calledWith("pm2 jlist", { shell: true });
	});

	it("#isErrored - shoudl return true", ({ processManager }) => {
		// Arrange...
		const spySync = stub(execa, "sync").returnValue({
			failed: false,
			stderr: undefined,
			stdout: '[{ "id": "stub", "pm2_env": { "status": "errored" } }]',
		});

		// Act...
		const status = processManager.isErrored("stub");

		// Assert...
		assert.true(status);
		spySync.calledWith("pm2 jlist", { shell: true });
	});

	it("#isOneLaunch - should return true", ({ processManager }) => {
		// Arrange...
		const spySync = stub(execa, "sync").returnValue({
			failed: false,
			stderr: undefined,
			stdout: '[{ "id": "stub", "pm2_env": { "status": "one-launch-status" } }]',
		});

		// Act...
		const status = processManager.isOneLaunch("stub");

		// Assert...
		assert.true(status);
		spySync.calledWith("pm2 jlist", { shell: true });
	});

	it("#isUnknown - should return true if the process has a status of [unknown]", ({ processManager }) => {
		// Arrange...
		const spySync = stub(execa, "sync").returnValue({
			failed: false,
			stderr: undefined,
			stdout: '[{ "id": "stub", "pm2_env": { "status": "unknown" } }]',
		});

		// Act...
		const status = processManager.isUnknown("stub");

		// Assert...
		assert.true(status);
		spySync.calledWith("pm2 jlist", { shell: true });
	});

	it("#isUnknown - should return false if the process has a status other than [unknown]", ({ processManager }) => {
		// Arrange...
		const spySync = stub(execa, "sync").returnValue({
			failed: false,
			stderr: undefined,
			stdout: '[{ "id": "stub", "pm2_env": { "status": "online" } }]',
		});

		// Act...
		const status = processManager.isUnknown("stub");

		// Assert...
		assert.false(status);
		spySync.calledWith("pm2 jlist", { shell: true });
	});

	it("#isUnknown - return true if an exception is thrown", ({ processManager }) => {
		// Arrange...
		const spySync = stub(execa, "sync").callsFake(() => {
			throw new Error("Whoops");
		});

		// Act...
		const status = processManager.isUnknown("stub");

		// Assert...
		assert.true(status);
		spySync.calledWith("pm2 jlist", { shell: true });
	});

	it("#has - should return true if the process ID is a number", ({ processManager }) => {
		// Arrange...
		const spySync = stub(execa, "sync").returnValue({
			failed: false,
			stderr: undefined,
			stdout: 1,
		});

		// Act...
		const status = processManager.has("stub");

		// Assert...
		assert.true(status);
		spySync.calledWith("pm2 id stub | awk '{ print $2 }'", { shell: true });
	});

	it("#has - return false if the process ID is not a number", ({ processManager }) => {
		// Arrange...
		const spySync = stub(execa, "sync").returnValue({
			failed: false,
			stderr: undefined,
			stdout: "",
		});

		// Act...
		const status = processManager.has("stub");

		// Assert...
		assert.false(status);
		spySync.calledWith("pm2 id stub | awk '{ print $2 }'", { shell: true });
	});

	it("#has - should return false if an exception is thrown", ({ processManager }) => {
		// Arrange...
		const spySync = stub(execa, "sync").callsFake(() => {
			throw new Error("Whoops");
		});

		// Act...
		const status = processManager.has("stub");

		// Assert...
		assert.false(status);
		spySync.calledWith("pm2 id stub | awk '{ print $2 }'", { shell: true });
	});

	it("#missing - return true if the process ID is not a number", ({ processManager }) => {
		// Arrange...
		const spySync = stub(execa, "sync").returnValue({
			failed: false,
			stderr: undefined,
			stdout: "",
		});

		// Act...
		const status = processManager.missing("stub");

		// Assert...
		assert.true(status);
		spySync.calledWith("pm2 id stub | awk '{ print $2 }'", { shell: true });
	});

	it("#missing - return false if the process ID is a number", ({ processManager }) => {
		// Arrange...
		const spySync = stub(execa, "sync").returnValue({
			failed: false,
			stderr: undefined,
			stdout: 1,
		});

		// Act...
		const status = processManager.missing("stub");

		// Assert...
		assert.false(status);
		spySync.calledWith("pm2 id stub | awk '{ print $2 }'", { shell: true });
	});
});
