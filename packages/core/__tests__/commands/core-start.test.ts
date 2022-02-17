import os from "os";
import { Container } from "@arkecosystem/core-cli";
import { Command } from "@packages/core/source/commands/core-start";
import { Console } from "@packages/core-test-framework";
import { writeJSONSync } from "fs-extra";
import { resolve } from "path";
import { dirSync, setGracefulCleanup } from "tmp";

let cli;
let processManager;
beforeEach(() => {
	process.env.CORE_PATH_CONFIG = dirSync().name;

	writeJSONSync(`${process.env.CORE_PATH_CONFIG}/delegates.json`, { secrets: ["bip39"] });

	cli = new Console();
	processManager = cli.app.get(Container.Identifiers.ProcessManager);
});

afterAll(() => setGracefulCleanup());

describe("StartCommand", () => {
	it("should throw if the process does not exist", async () => {
		jest.spyOn(os, "freemem").mockReturnValue(99_999_999_999);
		jest.spyOn(os, "totalmem").mockReturnValue(99_999_999_999);

		const spyStart = jest.spyOn(processManager, "start").mockImplementation();

		await cli.execute(Command);

		expect(spyStart).toHaveBeenCalledWith(
			{
				args: "core:run --network='testnet' --token='ark' --v=0 --env='production' --skipPrompts=false",
				env: {
					CORE_ENV: "production",
					NODE_ENV: "production",
				},
				name: "ark-core",
				node_args: undefined,
				script: resolve(__dirname, "../../../../packages/core/bin/run"),
			},
			{ "kill-timeout": 30_000, "max-restarts": 5, name: "ark-core" },
		);
	});
});
