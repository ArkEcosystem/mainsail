import { Utils } from "@arkecosystem/core-cli";
import { Utils as AppUtils } from "@arkecosystem/core-kernel";
import { Console, describe } from "@arkecosystem/core-test-framework";

import { Command } from "./relay-run";

describe<{
	cli: Console;
}>("RelayRunCommand", ({ beforeEach, afterAll, it, stub, assert }) => {
	beforeEach((context) => {
		context.cli = new Console();
	});

	it("should throw if the process does not exist", async ({ cli }) => {
		const spyBuildApplication = stub(Utils.Builder, "buildApplication");
		const spyBuildPeerFlags = stub(Utils.Builder, "buildPeerFlags").returnValue({});

		cli.execute(Command);

		await AppUtils.sleep(200);

		spyBuildApplication.calledOnce();
		spyBuildPeerFlags.calledOnce();
		assert.equal(spyBuildApplication.getCallArgs(0)[0].flags.processType, "relay");
	});
});
