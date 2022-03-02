import { Console } from "@arkecosystem/core-test-framework";
import { DaemonizeProcess } from "@packages/core-cli/source/actions";
import os from "os";

let cli;
let processManager;
let action;

beforeEach(() => {
	cli = new Console();
	processManager = cli.app.get(Identifiers.ProcessManager);

	// Bind from src instead of dist to collect coverage.
	cli.app.rebind(Identifiers.DaemonizeProcess).to(DaemonizeProcess).inSingletonScope();
	action = cli.app.get(Identifiers.DaemonizeProcess);
});

describe("DaemonizeProcess", () => {
	it("should throw if the process has entered an unknown state", () => {
		const has = jest.spyOn(processManager, "has").mockReturnValue(true);
		const isUnknown = jest.spyOn(processManager, "isUnknown").mockReturnValue(true);

		expect(() =>
			action.execute(
				{
					args: "core:run --daemon",
					name: "ark-core",
					script: "script",
				},
				{},
			),
		).toThrow('The "ark-core" process has entered an unknown state.');

		expect(has).toHaveBeenCalledWith("ark-core");
		expect(isUnknown).toHaveBeenCalledWith("ark-core");

		has.mockClear();
		isUnknown.mockClear();
	});

	it("should throw if the process is running", () => {
		const has = jest.spyOn(processManager, "has").mockReturnValue(true);
		const isUnknown = jest.spyOn(processManager, "isUnknown").mockReturnValue(false);
		const isOnline = jest.spyOn(processManager, "isOnline").mockReturnValue(true);

		expect(() =>
			action.execute(
				{
					args: "core:run --daemon",
					name: "ark-core",
					script: "script",
				},
				{},
			),
		).toThrow('The "ark-core" process is already running.');

		expect(has).toHaveBeenCalledWith("ark-core");
		expect(isUnknown).toHaveBeenCalledWith("ark-core");
		expect(isOnline).toHaveBeenCalledWith("ark-core");

		has.mockClear();
		isUnknown.mockClear();
		isOnline.mockClear();
	});

	it("should continue execution if the process does not exist", () => {
		const has = jest.spyOn(processManager, "has").mockReturnValue(false);
		const isUnknown = jest.spyOn(processManager, "isUnknown").mockReturnValue(false);
		const isOnline = jest.spyOn(processManager, "isOnline").mockReturnValue(false);

		action.execute(
			{
				args: "core:run --daemon",
				name: "ark-core",
				script: "script",
			},
			{},
		);

		expect(has).toHaveBeenCalledWith("ark-core");
		expect(isUnknown).not.toHaveBeenCalledWith("ark-core");
		expect(isOnline).not.toHaveBeenCalledWith("ark-core");

		has.mockClear();
		isUnknown.mockClear();
		isOnline.mockClear();
	});

	it("should run with the [no-daemon] flag if the daemon flag is not set", () => {
		const has = jest.spyOn(processManager, "has").mockReturnValue(true);
		const isUnknown = jest.spyOn(processManager, "isUnknown").mockReturnValue(false);
		const isOnline = jest.spyOn(processManager, "isOnline").mockReturnValue(false);
		const totalmem = jest.spyOn(os, "totalmem").mockReturnValue(99_999_999_999);
		const start = jest.spyOn(processManager, "start").mockImplementation();

		action.execute(
			{
				args: "core:run --daemon",
				name: "ark-core",
				script: "script",
			},
			{},
		);

		expect(has).toHaveBeenCalledWith("ark-core");
		expect(isUnknown).toHaveBeenCalledWith("ark-core");
		expect(isOnline).toHaveBeenCalledWith("ark-core");
		expect(totalmem).toHaveBeenCalled();
		expect(start).toHaveBeenCalledWith(
			{
				args: "core:run --daemon",
				env: { CORE_ENV: undefined, NODE_ENV: "production" },
				name: "ark-core",
				node_args: undefined,
				script: "script",
			},
			{ "kill-timeout": 30_000, "max-restarts": 5, name: "ark-core", "no-daemon": true },
		);

		has.mockClear();
		isUnknown.mockClear();
		isOnline.mockClear();
		totalmem.mockClear();
		start.mockClear();
	});

	it("should run with the [no-daemon] flag if the daemon flag is false", () => {
		const has = jest.spyOn(processManager, "has").mockReturnValue(true);
		const isUnknown = jest.spyOn(processManager, "isUnknown").mockReturnValue(false);
		const isOnline = jest.spyOn(processManager, "isOnline").mockReturnValue(false);
		const totalmem = jest.spyOn(os, "totalmem").mockReturnValue(99_999_999_999);
		const start = jest.spyOn(processManager, "start").mockImplementation();

		action.execute(
			{
				args: "core:run --daemon",
				name: "ark-core",
				script: "script",
			},
			{ daemon: false },
		);

		expect(has).toHaveBeenCalledWith("ark-core");
		expect(isUnknown).toHaveBeenCalledWith("ark-core");
		expect(isOnline).toHaveBeenCalledWith("ark-core");
		expect(totalmem).toHaveBeenCalled();
		expect(start).toHaveBeenCalledWith(
			{
				args: "core:run --daemon",
				env: { CORE_ENV: undefined, NODE_ENV: "production" },
				name: "ark-core",
				node_args: undefined,
				script: "script",
			},
			{ "kill-timeout": 30_000, "max-restarts": 5, name: "ark-core", "no-daemon": true },
		);

		has.mockClear();
		isUnknown.mockClear();
		isOnline.mockClear();
		totalmem.mockClear();
		start.mockClear();
	});

	it("should run without the [--no-daemon] flag if the daemon flag is true", () => {
		const has = jest.spyOn(processManager, "has").mockReturnValue(true);
		const isUnknown = jest.spyOn(processManager, "isUnknown").mockReturnValue(false);
		const isOnline = jest.spyOn(processManager, "isOnline").mockReturnValue(false);
		const totalmem = jest.spyOn(os, "totalmem").mockReturnValue(99_999_999_999);
		const start = jest.spyOn(processManager, "start").mockImplementation();

		action.execute(
			{
				args: "core:run --daemon",
				name: "ark-core",
				script: "script",
			},
			{ daemon: true },
		);

		expect(has).toHaveBeenCalledWith("ark-core");
		expect(isUnknown).toHaveBeenCalledWith("ark-core");
		expect(isOnline).toHaveBeenCalledWith("ark-core");
		expect(totalmem).toHaveBeenCalled();
		expect(start).toHaveBeenCalledWith(
			{
				args: "core:run --daemon",
				env: { CORE_ENV: undefined, NODE_ENV: "production" },
				name: "ark-core",
				node_args: undefined,
				script: "script",
			},
			{ "kill-timeout": 30_000, "max-restarts": 5, name: "ark-core" },
		);

		has.mockClear();
		isUnknown.mockClear();
		isOnline.mockClear();
		totalmem.mockClear();
		start.mockClear();
	});

	it("should run with potato settings", () => {
		const has = jest.spyOn(processManager, "has").mockReturnValue(true);
		const isUnknown = jest.spyOn(processManager, "isUnknown").mockReturnValue(false);
		const isOnline = jest.spyOn(processManager, "isOnline").mockReturnValue(false);
		const totalmem = jest.spyOn(os, "totalmem").mockReturnValue(2 * 1024 ** 3 - 1);
		const start = jest.spyOn(processManager, "start").mockImplementation();

		action.execute(
			{
				args: "core:run --daemon",
				name: "ark-core",
				script: "script",
			},
			{},
		);

		expect(has).toHaveBeenCalledWith("ark-core");
		expect(isUnknown).toHaveBeenCalledWith("ark-core");
		expect(isOnline).toHaveBeenCalledWith("ark-core");
		expect(totalmem).toHaveBeenCalled();
		expect(start).toHaveBeenCalledWith(
			{
				args: "core:run --daemon",
				env: {
					CORE_ENV: undefined,
					NODE_ENV: "production",
				},
				name: "ark-core",
				node_args: {
					max_old_space_size: 500,
				},
				script: "script",
			},
			{ "kill-timeout": 30_000, "max-restarts": 5, name: "ark-core", "no-daemon": true },
		);

		has.mockClear();
		isUnknown.mockClear();
		isOnline.mockClear();
		totalmem.mockClear();
		start.mockClear();
	});

	it("should throw if an unknown error occurs", () => {
		const has = jest.spyOn(processManager, "has").mockReturnValue(true);
		const isUnknown = jest.spyOn(processManager, "isUnknown").mockReturnValue(false);
		const isOnline = jest.spyOn(processManager, "isOnline").mockReturnValue(false);
		const totalmem = jest.spyOn(os, "totalmem").mockReturnValue(99_999_999_999);
		const start = jest.spyOn(processManager, "start").mockImplementation(() => {
			throw new Error("unexpected error");
		});

		expect(() =>
			action.execute(
				{
					args: "core:run --daemon",
					name: "ark-core",
					script: "script",
				},
				{},
			),
		).toThrow("unexpected error");

		expect(has).toHaveBeenCalledWith("ark-core");
		expect(isUnknown).toHaveBeenCalledWith("ark-core");
		expect(isOnline).toHaveBeenCalledWith("ark-core");
		expect(totalmem).toHaveBeenCalled();
		expect(start).toHaveBeenCalledWith(
			{
				args: "core:run --daemon",
				env: { CORE_ENV: undefined, NODE_ENV: "production" },
				name: "ark-core",
				node_args: undefined,
				script: "script",
			},
			{ "kill-timeout": 30_000, "max-restarts": 5, name: "ark-core", "no-daemon": true },
		);

		has.mockClear();
		isUnknown.mockClear();
		isOnline.mockClear();
		totalmem.mockClear();
		start.mockClear();
	});

	it("should throw if an unknown error occurs (with stdrr)", () => {
		const has = jest.spyOn(processManager, "has").mockReturnValue(true);
		const isUnknown = jest.spyOn(processManager, "isUnknown").mockReturnValue(false);
		const isOnline = jest.spyOn(processManager, "isOnline").mockReturnValue(false);
		const totalmem = jest.spyOn(os, "totalmem").mockReturnValue(99_999_999_999);
		const start = jest.spyOn(processManager, "start").mockImplementation(() => {
			const error: Error = new Error("hello world");
			// @ts-ignore
			error.stderr = "unexpected error";

			throw error;
		});

		expect(() =>
			action.execute(
				{
					args: "core:run --daemon",
					name: "ark-core",
					script: "script",
				},
				{},
			),
		).toThrow("hello world: unexpected error");

		expect(has).toHaveBeenCalledWith("ark-core");
		expect(isUnknown).toHaveBeenCalledWith("ark-core");
		expect(isOnline).toHaveBeenCalledWith("ark-core");
		expect(totalmem).toHaveBeenCalled();
		expect(start).toHaveBeenCalledWith(
			{
				args: "core:run --daemon",
				env: { CORE_ENV: undefined, NODE_ENV: "production" },
				name: "ark-core",
				node_args: undefined,
				script: "script",
			},
			{ "kill-timeout": 30_000, "max-restarts": 5, name: "ark-core", "no-daemon": true },
		);

		has.mockClear();
		isUnknown.mockClear();
		isOnline.mockClear();
		totalmem.mockClear();
		start.mockClear();
	});
});
