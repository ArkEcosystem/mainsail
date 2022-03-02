import os from "os";
import { Container } from "@arkecosystem/core-cli";
import { Command } from "@packages/core/source/commands/relay-start";
import { Console } from "@packages/core-test-framework";
import { resolve } from "path";

let cli;
let processManager;
beforeEach(() => {
	cli = new Console();
	processManager = cli.app.get(Identifiers.ProcessManager);
});

describe("StartCommand", () => {
	it("should throw if the process does not exist", async () => {
		jest.spyOn(os, "freemem").mockReturnValue(99_999_999_999);
		jest.spyOn(os, "totalmem").mockReturnValue(99_999_999_999);

		const spyStart = jest.spyOn(processManager, "start").mockImplementation();

		await cli.execute(Command);

		expect(spyStart).toHaveBeenCalledWith(
			{
				args: "relay:run --network='testnet' --token='ark' --v=0 --env='production'",
				env: {
					CORE_ENV: "production",
					NODE_ENV: "production",
				},
				name: "ark-relay",
				node_args: undefined,
				script: resolve(__dirname, "../../../../packages/core/bin/run"),
			},
			{ "kill-timeout": 30_000, "max-restarts": 5, name: "ark-relay" },
		);
	});
});
