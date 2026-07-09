import { randomBytes } from "node:crypto";

import { Enums } from "@mainsail/constants";
import type { Contracts } from "@mainsail/contracts";
import { Evm } from "@mainsail/evm";
import { Application } from "@mainsail/kernel";
import { setGracefulCleanup } from "tmp";
import { zeroAddress } from "viem";

import { describe } from "@mainsail/test-runner";
import { wallets } from "../../test/fixtures/wallets";
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

	it("constructor throws on an unusable path instead of crashing", () => {
		// /dev/null is a file, so create_dir_all fails with ENOTDIR — even when running as root.
		assert.throws(() => new Evm({ path: "/dev/null/evm" }), "failed to open EVM database");
	});

	it("process rejects negative or oversized BigInt fields instead of truncating", async ({ instance }) => {
		const commitKey = { blockNumber: 0n, round: 0n };
		await instance.prepareNextCommit({
			blockContext: { commitKey, gasLimit: 10_000_000n, timestamp: 12_345n, validatorAddress: zeroAddress },
		});

		const base = {
			commitKey,
			data: Buffer.alloc(0),
			from: wallets[0].address,
			gasLimit: 21_000n,
			gasPrice: 0n,
			nonce: 0n,
			specId: Enums.Evm.SpecId.SHANGHAI,
			to: wallets[1].address,
			txHash: randomBytes(32).toString("hex"),
			value: 0n,
		};

		for (const [field, bad] of [
			["gasLimit", 2n ** 64n],
			["gasLimit", -21_000n],
			["gasPrice", 2n ** 128n],
			["nonce", -1n],
			["value", -1n],
		] as const) {
			await assert.rejects(
				() => instance.process({ ...base, [field]: bad, txHash: randomBytes(32).toString("hex") }),
				field,
			);
		}

		// The same context with valid values still processes.
		const { receipt } = await instance.process(base);
		assert.equal(receipt.status, 1);
	});

	it("importAccountInfos rejects a negative balance", async ({ instance }) => {
		await assert.rejects(
			() =>
				instance.importAccountInfos([
					{ address: wallets[0].address, balance: -1n, legacyAttributes: {}, nonce: 0n },
				]),
			"balance",
		);
	});
});
