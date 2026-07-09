import type { Contracts } from "@mainsail/contracts";
import { Application } from "@mainsail/kernel";
import { setGracefulCleanup } from "tmp";

import { describe } from "@mainsail/test-runner";
import { processGenesis } from "../../test/helpers/commit-genesis";
import { prepareSandbox } from "../../test/helpers/prepare-sandbox";
import { EvmInstance } from "./evm";

describe<{
	app: Application;
	instance: Contracts.Evm.Instance & Contracts.Evm.Storage;
}>("EvmInstance - napi boundary", ({ assert, afterAll, afterEach, beforeEach, it }) => {
	afterAll(() => setGracefulCleanup());

	afterEach(async (context) => {
		await context.instance.dispose();
	});

	beforeEach(async (context) => {
		await prepareSandbox(context);
		context.instance = context.app.resolve(EvmInstance);
	});

	const makeUnit = (genesisCommit: Contracts.Crypto.Commit): Contracts.Processor.ProcessableUnit =>
		({
			blockNumber: genesisCommit.block.number,
			getAccountUpdates: () => [],
			getBlock: () => genesisCommit.block,
			getCommit: async () => genesisCommit,
			round: genesisCommit.block.round,
			setAccountUpdates: () => {},
		}) as unknown as Contracts.Processor.ProcessableUnit;

	it("onCommit rejects malformed transaction r/s and stays usable", async ({ app, instance }) => {
		const { genesisCommit } = await processGenesis(app, instance);
		const transaction = genesisCommit.block.transactions[0];
		assert.defined(transaction);

		// r/s are readonly on the Transaction contract; the test corrupts them in place on purpose.
		const mutable = transaction as unknown as Record<"r" | "s", string | undefined>;

		const original = transaction.r;

		for (const [field, bad] of [
			["r", "zz"], // non-hex
			["r", "abc"], // odd length
			["r", "ff".repeat(33)], // 33 bytes, does not fit in u256
			["s", "zz"],
		] as const) {
			const restore = transaction[field];
			mutable[field] = bad;

			await assert.rejects(() => instance.onCommit(makeUnit(genesisCommit)), `transaction ${field}`);

			mutable[field] = restore;
		}

		// The failed attempts happened before any state mutation: the same pending commit
		// still seals fine with the original values.
		mutable.r = original;
		await instance.onCommit(makeUnit(genesisCommit));
		assert.defined(await instance.getCommitData(0));
	});

	it("onCommit rejects a transactionsCount mismatch and stays usable", async ({ app, instance }) => {
		const { genesisCommit } = await processGenesis(app, instance);

		// transactionsCount is readonly on the Block contract; the test corrupts it on purpose.
		const header = genesisCommit.block as unknown as Record<"transactionsCount", number>;
		const original = header.transactionsCount;

		header.transactionsCount = original + 1;
		await assert.rejects(() => instance.onCommit(makeUnit(genesisCommit)), "transactions count mismatch");

		header.transactionsCount = original;
		await instance.onCommit(makeUnit(genesisCommit));
		assert.defined(await instance.getCommitData(0));
	});
});
