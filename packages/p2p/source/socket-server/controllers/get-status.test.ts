import { Identifiers } from "@mainsail/constants";
import esmock from "esmock";

import { Application } from "@mainsail/kernel";
import { Container } from "@mainsail/container";
import { describe } from "@mainsail/test-runner";
import { GetStatusController } from "./get-status";

const { GetStatusController: GetStatusControllerProxy } = await esmock("./get-status", {
	"../utils/get-peer-config": {
		getPeerConfig: () => ({}),
	},
});

describe<{
	app: Application;
	controller: GetStatusController;
}>("GetStatusController", ({ it, assert, beforeEach, stub }) => {
	const store = { getLastBlock: () => {} };

	beforeEach((context) => {
		context.app = new Application(new Container());

		context.app.bind(Identifiers.State.Store).toConstantValue(store);

		context.controller = context.app.resolve(GetStatusControllerProxy);
	});

	it("should return the status based on last block", async ({ controller }) => {
		const number = 1987;
		const hash = "984003423092345907";
		const lastBlock = {
			data: { number, hash },
		};

		stub(store, "getLastBlock").returnValue(lastBlock);

		const status = await controller.handle({}, {});

		assert.equal(status, {
			config: {},
			state: {
				blockNumber: number,
				blockHash: hash,
			},
		});
	});
});
