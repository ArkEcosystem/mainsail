import { Console, describe } from "@arkecosystem/core-test-framework";
import ngrok from "ngrok";

import { Command } from "./relay-share";

describe<{
	cli: Console;
}>("RelayShareCommand", ({ beforeEach, it, stub, assert }) => {
	beforeEach((context) => {
		context.cli = new Console();
	});

	it("should throw if the process does not exist", async ({ cli }) => {
		const spyConnect = stub(ngrok, "connect");

		await cli.execute(Command);

		spyConnect.calledOnce();
		spyConnect.calledWith({
			addr: 4003,
			auth: undefined,
			authtoken: undefined,
			proto: "http",
			region: "eu",
			subdomain: undefined,
		});
	});
});
