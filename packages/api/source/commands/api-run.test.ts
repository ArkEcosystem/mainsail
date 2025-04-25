import { Utils } from "@mainsail/cli";
import { sleep } from "@mainsail/utils";
import { dirSync, setGracefulCleanup } from "tmp";

import { Console, describe } from "../../../test-framework/source";
import { Command } from "./api-run";

describe<{
	cli: Console;
}>("ApiRunCommand", ({ beforeEach, afterAll, it, stub, assert }) => {
	beforeEach((context) => {
		process.env.MAINSAIL_PATH_CONFIG = dirSync().name;

		context.cli = new Console();
	});

	afterAll(() => setGracefulCleanup());

	it("should throw if the process does not exist", async ({ cli }) => {
		const spyBuildApplication = stub(Utils.Builder, "buildApplication");

		cli.execute(Command);

		await sleep(200);

		spyBuildApplication.calledOnce();
	});
});
