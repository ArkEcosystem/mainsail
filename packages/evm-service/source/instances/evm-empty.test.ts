import type { Contracts } from "@mainsail/contracts";
import { Application } from "@mainsail/kernel";
import { setGracefulCleanup } from "tmp";
import { zeroHash } from "viem";

import { describe } from "@mainsail/test-runner";
import { wallets } from "../../test/fixtures/wallets";
import { prepareSandbox } from "../../test/helpers/prepare-sandbox";
import { EvmInstance } from "./evm";

// A freshly resolved instance with no genesis and nothing committed: every read should return
// its "empty" variant (zero / empty / undefined).
describe<{
	app: Application;
	instance: Contracts.Evm.Instance & Contracts.Evm.Storage;
}>("EvmInstance - empty", ({ assert, afterAll, afterEach, beforeEach, it }) => {
	afterAll(() => setGracefulCleanup());

	afterEach(async ({ instance }) => {
		await instance.dispose();
	});

	beforeEach(async (context) => {
		await prepareSandbox(context);
		context.instance = context.app.resolve(EvmInstance);
	});

	it("isEmpty is true", async ({ instance }) => {
		assert.true(await instance.isEmpty());
	});

	it("getState reports block number 0 and total round 0", async ({ instance }) => {
		assert.equal(await instance.getState(), { blockNumber: 0, totalRound: 0 });
	});

	it("getAccountInfo reports a zero balance and nonce for an unknown account", async ({ instance }) => {
		const [wallet] = wallets;

		assert.equal(await instance.getAccountInfo(wallet.address), { balance: 0n, nonce: 0n });
	});

	it("getAccounts is empty", async ({ instance }) => {
		const { accounts } = await instance.getAccounts(0n, 100n);

		assert.equal(accounts, []);
	});

	it("getLegacyAttributes returns nothing", async ({ instance }) => {
		const [wallet] = wallets;

		assert.undefined((await instance.getLegacyAttributes(wallet.address)) ?? undefined);
	});

	it("getReceipts is empty", async ({ instance }) => {
		const { receipts } = await instance.getReceipts(0n, 100n);

		assert.equal(receipts, []);
	});

	it("getReceiptsByBlockNumber is an empty record", async ({ instance }) => {
		assert.equal(await instance.getReceiptsByBlockNumber(0n), {});
	});

	it("getBlockNumberByHash returns undefined", async ({ instance }) => {
		assert.undefined(await instance.getBlockNumberByHash(zeroHash));
	});

	it("getBlockHeaderData returns nothing", async ({ instance }) => {
		assert.undefined((await instance.getBlockHeaderData(0)) ?? undefined);
	});

	it("getCommitData returns undefined", async ({ instance }) => {
		assert.undefined(await instance.getCommitData(0));
	});

	it("getTransactionData returns nothing", async ({ instance }) => {
		assert.undefined((await instance.getTransactionData(zeroHash)) ?? undefined);
	});

	it("getTransactionKeyByHash returns nothing", async ({ instance }) => {
		assert.undefined((await instance.getTransactionKeyByHash(zeroHash)) ?? undefined);
	});

	it("codeAt returns empty code", async ({ instance }) => {
		const [wallet] = wallets;

		assert.equal(await instance.codeAt(wallet.address), "0x");
	});
});
