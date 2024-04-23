import { Contracts } from "@mainsail/contracts";
import { describe, Sandbox } from "@mainsail/test-framework";
import { EvmCalls } from "@mainsail/test-transaction-builders";
// import { ContractAbis, Identifiers as EvmDevelopmentIdentifiers } from "@mainsail/evm-development";
import { setup, shutdown } from "./setup.js";
import { Snapshot, takeSnapshot } from "./snapshot.js";
import { addTransactionsToPool, getWallets, waitBlock, waitForEvmResult } from "./utils.js";

describe<{
	sandbox: Sandbox;
	snapshot: Snapshot;
	wallets: Contracts.Crypto.KeyPair[];
}>("EVM Call", ({ beforeEach, afterEach, it, assert }) => {
	beforeEach(async (context) => {
		context.sandbox = await setup();
		context.wallets = await getWallets(context.sandbox);
		context.snapshot = await takeSnapshot(context.sandbox);
	});

	afterEach(async ({ sandbox, snapshot }) => {
		await snapshot.validate();

		await shutdown(sandbox);
	});

	it("should accept and commit evm call", async (context) => {
		const tx = await EvmCalls.makeEvmCall(context);

		const { accept } = await addTransactionsToPool(context, [tx]);
		assert.equal(accept, [0]);

		const { result } = await waitForEvmResult(context.sandbox);
		console.log(result);
		assert.true(result.success);
	});
});
