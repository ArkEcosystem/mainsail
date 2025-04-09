import { Identifiers } from "@mainsail/contracts";
import esmock from "esmock";

import { describe, Sandbox } from "../../../../test-framework/source";
import { GetStatusController } from "./get-status";

const { GetStatusController: GetStatusControllerProxy } = await esmock("./get-status", {
	"../utils/get-peer-config": {
		getPeerConfig: () => ({}),
	},
});

describe<{
	sandbox: Sandbox;
	controller: GetStatusController;
}>("GetStatusController", ({ it, assert, beforeEach, stub }) => {
	const store = { getLastBlock: () => {} };

	beforeEach((context) => {
		context.sandbox = new Sandbox();

		context.sandbox.app.bind(Identifiers.State.Store).toConstantValue(store);

		context.controller = context.sandbox.app.resolve(GetStatusControllerProxy);
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
