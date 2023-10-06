import { Contracts, Identifiers } from "@mainsail/contracts";
import rewiremock from "rewiremock";

import { describe, Sandbox } from "../../../../test-framework";
import { GetStatusController } from "./get-status";

describe<{
	sandbox: Sandbox;
	controller: GetStatusController;
}>("GetStatusController", ({ it, assert, beforeEach, stub }) => {
	const { GetStatusController: GetStatusControllerProxy } = rewiremock.proxy<{
		GetStatusController: Contracts.Types.Class<GetStatusController>;
	}>("./get-status", {
		"../utils/get-peer-config": {
			getPeerConfig: () => ({}),
		},
	});

	const stateStore = { getLastBlock: () => {} };
	const stateService = { getStateStore: () => stateStore };
	const slots = { getSlotInfo: () => {} };

	beforeEach((context) => {
		context.sandbox = new Sandbox();

		context.sandbox.app.bind(Identifiers.StateService).toConstantValue(stateService);

		context.controller = context.sandbox.app.resolve(GetStatusControllerProxy);
	});

	it("should return the status based on last block", async ({ controller }) => {
		const header = { id: "984003423092345907" };
		const height = 1987;
		const lastBlock = {
			data: { height },
			header,
		};

		stub(stateStore, "getLastBlock").returnValue(lastBlock);
		const slotInfo = {
			blockTime: 8000,
			endTime: 99_000,
			forgingStatus: true,
			slotNumber: 344,
			startTime: 98_700,
		};

		stub(slots, "getSlotInfo").returnValue(slotInfo);

		const status = await controller.handle({}, {});

		assert.equal(status, {
			config: {},
			state: {
				header,
				height,
			},
		});
	});
});
