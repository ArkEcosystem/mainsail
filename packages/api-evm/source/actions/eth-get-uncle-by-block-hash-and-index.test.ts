import { Identifiers } from "@mainsail/constants";
import { RpcError } from "@mainsail/exceptions";
import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";

import { EthGetUncleByBlockHashAndIndex } from "./index.js";

describe<{
	app: Application;
	action: EthGetUncleByBlockHashAndIndex;
	database: any;
}>("EthGetUncleByBlockHashAndIndex", ({ beforeEach, it, assert }) => {
	beforeEach((context) => {
		context.database = {
			hasCommitByHash: async () => true,
		};

		context.app = new Application();
		context.app.bind(Identifiers.Database.Service).toConstantValue(context.database);

		context.action = context.app.resolve(EthGetUncleByBlockHashAndIndex);
	});

	it("should have a name", ({ action }) => {
		assert.equal(action.name, "eth_getUncleByBlockHashAndIndex");
	});

	it("should return null when the block exists (no uncles)", async ({ action }) => {
		assert.null(await action.handle(["0xabc", "0x0"]));
	});

	it("should pass the hash without 0x prefix to the database", async ({ action, database }) => {
		let received: string | undefined;
		database.hasCommitByHash = async (hash: string) => {
			received = hash;
			return true;
		};

		await action.handle(["0xdeadbeef", "0x0"]);

		assert.equal(received, "deadbeef");
	});

	it("should throw when the block is not found", async ({ action, database }) => {
		database.hasCommitByHash = async () => false;

		await assert.rejects(() => action.handle(["0xabc", "0x0"]), RpcError);
	});
});
