import { Identifiers } from "@mainsail/constants";
import { RpcError } from "@mainsail/exceptions";
import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";

import { EthGetUncleCountByBlockNumber } from "./index.js";

describe<{
	app: Application;
	action: EthGetUncleCountByBlockNumber;
	stateStore: any;
}>("EthGetUncleCountByBlockNumber", ({ beforeEach, it, assert }) => {
	beforeEach((context) => {
		context.stateStore = {
			getBlockNumber: () => 100,
		};

		context.app = new Application();
		context.app.bind(Identifiers.State.Store).toConstantValue(context.stateStore);

		context.action = context.app.resolve(EthGetUncleCountByBlockNumber);
	});

	it("should have a name", ({ action }) => {
		assert.equal(action.name, "eth_getUncleCountByBlockNumber");
	});

	it("should return 0x0 when the block number exists (no uncles)", async ({ action }) => {
		assert.equal(await action.handle(["0x10"]), "0x0");
	});

	it("should return 0x0 at the boundary (equal to current block number)", async ({ action }) => {
		assert.equal(await action.handle(["0x64"]), "0x0"); // 0x64 === 100
	});

	it("should throw when the block number is greater than the current height", async ({ action }) => {
		await assert.rejects(() => action.handle(["0x65"]), RpcError); // 0x65 === 101 > 100
	});
});
