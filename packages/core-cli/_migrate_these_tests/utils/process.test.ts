import { Console } from "@arkecosystem/core-test-framework";
import { Container } from "@packages/core-cli";
import { Process } from "@packages/core-cli/source/utils";
import { fileSync, setGracefulCleanup } from "tmp";

jest.mock("nodejs-tail");

let cli;
let proc;
let processManager;
beforeEach(() => {
	cli = new Console();
	processManager = cli.app.get(Identifiers.ProcessManager);

	cli.app
		.rebind(Identifiers.ProcessFactory)
		.toFactory((context: Container.interfaces.Context) => (token: string, type: string): Process => {
			const process: Process = context.container.resolve(Process);
			process.initialize(token, type);

			return process;
		});

	proc = cli.app.get(Identifiers.ProcessFactory)("ark", "core");
});

afterEach(() => jest.restoreAllMocks());

afterAll(() => setGracefulCleanup());

describe("Process", () => {
	describe("#stop", () => {
		it("should throw if the process does not exist", () => {
			const missing = jest.spyOn(processManager, "missing").mockReturnValue(true);
			const isUnknown = jest.spyOn(processManager, "isUnknown").mockReturnValue(false);
			const isStopped = jest.spyOn(processManager, "isStopped").mockReturnValue(false);

			expect(() => proc.stop()).toThrowError('The "ark-core" process does not exist.');

			missing.mockReset();
			isUnknown.mockReset();
			isStopped.mockReset();
		});

		it("should throw if the process entered an unknown state", () => {
			const missing = jest.spyOn(processManager, "missing").mockReturnValue(false);
			const isUnknown = jest.spyOn(processManager, "isUnknown").mockReturnValue(true);
			const isStopped = jest.spyOn(processManager, "isStopped").mockReturnValue(false);

			expect(() => proc.stop()).toThrowError('The "ark-core" process has entered an unknown state.');

			missing.mockReset();
			isUnknown.mockReset();
			isStopped.mockReset();
		});

		it("should throw if the process is stopped", () => {
			const missing = jest.spyOn(processManager, "missing").mockReturnValue(false);
			const isUnknown = jest.spyOn(processManager, "isUnknown").mockReturnValue(false);
			const isStopped = jest.spyOn(processManager, "isStopped").mockReturnValue(true);

			expect(() => proc.stop()).toThrowError('The "ark-core" process is not running.');

			missing.mockReset();
			isUnknown.mockReset();
			isStopped.mockReset();
		});

		it("should stop the process if the [--daemon] flag is not present", () => {
			const missing = jest.spyOn(processManager, "missing").mockReturnValue(false);
			const isUnknown = jest.spyOn(processManager, "isUnknown").mockReturnValue(false);
			const isStopped = jest.spyOn(processManager, "isStopped").mockReturnValue(false);
			const deleteSpy = jest.spyOn(processManager, "delete").mockImplementation();

			proc.stop(true);

			expect(deleteSpy).toHaveBeenCalled();

			missing.mockReset();
			isUnknown.mockReset();
			isStopped.mockReset();
			deleteSpy.mockReset();
		});

		it("should delete the process if the [--daemon] flag is present", () => {
			const missing = jest.spyOn(processManager, "missing").mockReturnValue(false);
			const isUnknown = jest.spyOn(processManager, "isUnknown").mockReturnValue(false);
			const isStopped = jest.spyOn(processManager, "isStopped").mockReturnValue(false);
			const stop = jest.spyOn(processManager, "stop").mockImplementation();

			proc.stop();

			expect(stop).toHaveBeenCalled();

			missing.mockReset();
			isUnknown.mockReset();
			isStopped.mockReset();
			stop.mockReset();
		});
	});

	describe("#restart", () => {
		it("should throw if the process does not exist", () => {
			const missing = jest.spyOn(processManager, "missing").mockReturnValue(true);
			const isStopped = jest.spyOn(processManager, "isStopped").mockReturnValue(false);

			expect(() => proc.restart()).toThrowError('The "ark-core" process does not exist.');

			missing.mockReset();
			isStopped.mockReset();
		});

		it("should throw if the process is stopped", () => {
			const missing = jest.spyOn(processManager, "missing").mockReturnValue(false);
			const isStopped = jest.spyOn(processManager, "isStopped").mockReturnValue(true);

			expect(() => proc.restart()).toThrowError('The "ark-core" process is not running.');

			missing.mockReset();
			isStopped.mockReset();
		});

		it("should restart the process", () => {
			const missing = jest.spyOn(processManager, "missing").mockReturnValue(false);
			const isStopped = jest.spyOn(processManager, "isStopped").mockReturnValue(false);
			const restart = jest.spyOn(processManager, "restart").mockImplementation();

			proc.restart();

			expect(restart).toHaveBeenCalled();

			missing.mockReset();
			isStopped.mockReset();
			restart.mockReset();
		});
	});

	describe("#status", () => {
		it("should throw if the process does not exist", async () => {
			expect(() => proc.status()).toThrow('The "ark-core" process does not exist.');
		});

		it("should render a table with the process information", async () => {
			jest.spyOn(processManager, "missing").mockReturnValue(false);
			jest.spyOn(processManager, "describe").mockReturnValue({
				monit: { cpu: 2, memory: 2048 },
				name: "ark-core",
				pid: 1,
				pm2_env: {
					pm_uptime: 1_387_045_673_686,
					status: "online",
					version: "1.0.0",
				},
			});

			let message: string;
			jest.spyOn(console, "log").mockImplementationOnce((m) => (message = m));

			proc.status();

			expect(message).toIncludeMultiple(["ID", "Name", "Version", "Status", "Uptime", "CPU", "RAM"]);
			expect(message).toIncludeMultiple([
				"1",
				"ark-core",
				"1.0.0",
				"online",
				// "5y 267d 19h 31m 28.1s",
				"2%",
				"2.05 kB",
			]);
		});
	});

	describe("#log", () => {
		it("should throw if the process does not exist", async () => {
			await expect(proc.log()).rejects.toThrow('The "ark-core" process does not exist.');
		});

		it("should log to pm_out_log_path", async () => {
			jest.spyOn(cli.app.get(Identifiers.AbortMissingProcess), "execute").mockImplementation();
			jest.spyOn(processManager, "describe").mockReturnValue({
				monit: { cpu: 2, memory: 2048 },
				name: "ark-core",
				pid: 1,
				pm2_env: {
					pm_err_log_path: fileSync().name,
					pm_out_log_path: fileSync().name,
					pm_uptime: 1_387_045_673_686,
					status: "online",
					version: "1.0.0",
				},
			});

			const spyLog = jest.spyOn(console, "log");

			await proc.log(false, 15);

			expect(spyLog).toHaveBeenCalledWith(
				"Tailing last 15 lines for [ark-core] process (change the value with --lines option)",
			);
		});

		it("should log to pm_err_log_path", async () => {
			jest.spyOn(cli.app.get(Identifiers.AbortMissingProcess), "execute").mockImplementation();
			jest.spyOn(processManager, "describe").mockReturnValue({
				monit: { cpu: 2, memory: 2048 },
				name: "ark-core",
				pid: 1,
				pm2_env: {
					pm_err_log_path: fileSync().name,
					pm_out_log_path: fileSync().name,
					pm_uptime: 1_387_045_673_686,
					status: "online",
					version: "1.0.0",
				},
			});

			const spyLog = jest.spyOn(console, "log");

			await proc.log(true, 15);

			expect(spyLog).toHaveBeenCalledWith(
				"Tailing last 15 lines for [ark-core] process (change the value with --lines option)",
			);
		});
	});
});
