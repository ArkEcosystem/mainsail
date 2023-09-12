import { Utils } from "@mainsail/cli";
import { Utils as AppUtils } from "@mainsail/kernel";
import { Console, describe } from "@mainsail/test-framework";
import { dirSync, setGracefulCleanup } from "tmp";

import { Command } from "./api-run";

describe<{
	cli: Console;
}>("ApiRunCommand", ({ beforeEach, afterAll, it, stub, assert }) => {
	beforeEach((context) => {
		process.env.CORE_PATH_CONFIG = dirSync().name;

		context.cli = new Console();
	});

	afterAll(() => setGracefulCleanup());

	it("should throw if the process does not exist", async ({ cli }) => {
		const spyBuildApplication = stub(Utils.Builder, "buildApplication");

		cli.execute(Command);

		await AppUtils.sleep(200);

		spyBuildApplication.calledOnce();
	});
});
