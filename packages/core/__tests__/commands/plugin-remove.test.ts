import "jest-extended";

import { Command } from "@packages/core/source/commands/plugin-remove";
import { Console } from "@packages/core-test-framework";

let cli;
let spyOnRemove;
const packageName = "dummyPackageName";
const token = "ark";
const network = "testnet";

beforeEach(() => {
	cli = new Console();

	const pluginManager = cli.app.get(Identifiers.PluginManager);
	spyOnRemove = jest.spyOn(pluginManager, "remove").mockImplementation(async () => {});
});

afterEach(() => {
	jest.clearAllMocks();
});

describe("PluginRemoveCommand", () => {
	it("should throw when package name is not provided", async () => {
		await expect(cli.execute(Command)).rejects.toThrow(`"package" is required`);

		expect(spyOnRemove).not.toHaveBeenCalled();
	});

	it("should call remove", async () => {
		jest.spyOn(cli.app, "getCorePath").mockReturnValueOnce(null);
		await expect(cli.withArgs([packageName]).withFlags({ network, token }).execute(Command)).toResolve();

		expect(spyOnRemove).toHaveBeenCalledWith(token, network, packageName);
	});
});
