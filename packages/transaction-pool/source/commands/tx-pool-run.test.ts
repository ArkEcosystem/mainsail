import { Utils } from "@mainsail/cli";
import { Utils as AppUtils } from "@mainsail/kernel";
import { dirSync, setGracefulCleanup } from "tmp";

import { Console, describe } from "../../../test-framework/source";
import { Command } from "./tx-pool-run";

describe<{
	cli: Console;
}>("RunCommand", ({ beforeEach, afterAll, it, stub, assert }) => {
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
