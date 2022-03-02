import { Console } from "@arkecosystem/core-test-framework";
import { ActionFactory, Container } from "@packages/core-cli/source";

let cli;
beforeEach(() => (cli = new Console()));

describe("ActionFactory", () => {
	it("should create an instance", () => {
		expect(cli.app.resolve(ActionFactory)).toBeInstanceOf(ActionFactory);
	});

	describe.each([
		["abortErroredProcess", Identifiers.AbortErroredProcess],
		["abortMissingProcess", Identifiers.AbortMissingProcess],
		["abortRunningProcess", Identifiers.AbortRunningProcess],
		["abortStoppedProcess", Identifiers.AbortStoppedProcess],
		["abortUnknownProcess", Identifiers.AbortUnknownProcess],
		["daemonizeProcess", Identifiers.DaemonizeProcess],
		["restartProcess", Identifiers.RestartProcess],
		["restartRunningProcess", Identifiers.RestartRunningProcess],
		["restartRunningProcessWithPrompt", Identifiers.RestartRunningProcessWithPrompt],
	])("%s", (method, binding) => {
		it("should call be called", async () => {
			const spy = jest.spyOn(cli.app.get(binding), "execute").mockImplementation();

			await cli.app.resolve(ActionFactory)[method]();

			expect(spy).toHaveBeenCalled();
		});
	});
});
