import { Utils } from "@arkecosystem/core-cli";
import { Utils as AppUtils } from "@arkecosystem/core-kernel";
import { Console, describe } from "@arkecosystem/core-test-framework";
import { writeJSONSync } from "fs-extra";
import { dirSync, setGracefulCleanup } from "tmp";

import { Command } from "./forger-run";

describe<{
	cli: Console;
}>("ForgerRunCommand", ({ beforeEach, afterAll, it, stub, assert }) => {
	beforeEach((context) => {
		process.env.CORE_PATH_CONFIG = dirSync().name;

		writeJSONSync(`${process.env.CORE_PATH_CONFIG}/delegates.json`, { secrets: ["bip39"] });

		context.cli = new Console();
	});

	afterAll(() => setGracefulCleanup());

	it("should throw if the process does not exist", async ({ cli }) => {
		const spyBuildApplication = stub(Utils.Builder, "buildApplication");

		cli.execute(Command);

		await AppUtils.sleep(200);

		spyBuildApplication.calledOnce();
		assert.equal(spyBuildApplication.getCallArgs(0)[0].flags.processType, "forger");
	});
});
