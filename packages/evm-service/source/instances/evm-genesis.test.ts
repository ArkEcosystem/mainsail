import type { Contracts } from "@mainsail/contracts";
import { Application } from "@mainsail/kernel";
import { setGracefulCleanup } from "tmp";
import { zeroHash } from "viem";

import { describe } from "@mainsail/test-runner";
import { commitGenesis } from "../../test/helpers/commit-genesis";
import { prepareSandbox } from "../../test/helpers/prepare-sandbox";
import { EvmInstance } from "./evm";

// The real devnet genesis commit applied once. Every read should now reflect the committed
// block, its transactions, receipts and funded accounts. The reads don't mutate state, so a
// single committed instance is shared across the suite.
describe<{
	app: Application;
	instance: Contracts.Evm.Instance & Contracts.Evm.Storage;
	genesisCommit: Contracts.Crypto.Commit;
}>("EvmInstance - genesis", ({ assert, afterAll, beforeAll, it }) => {
	beforeAll(async (context) => {
		await prepareSandbox(context);
		context.instance = context.app.resolve(EvmInstance);
		context.genesisCommit = await commitGenesis(context.app, context.instance);
	});

	afterAll(async (context) => {
		await context.instance.dispose();
		setGracefulCleanup();
	});

	it("isEmpty is false", async ({ instance }) => {
		assert.false(await instance.isEmpty());
	});

	it("getState reports block number 0 and an increased total round", async ({ instance }) => {
		assert.equal(await instance.getState(), { blockNumber: 0, totalRound: 1 });
	});

	it("getBlockNumberByHash resolves the genesis hash to block 0", async ({ instance, genesisCommit }) => {
		assert.equal(await instance.getBlockNumberByHash(genesisCommit.block.hash), 0);
	});

	it("getBlockNumberByHash still returns undefined for an unknown hash", async ({ instance }) => {
		assert.undefined(await instance.getBlockNumberByHash(zeroHash));
	});

	it("getBlockHeaderData returns the genesis header", async ({ instance, genesisCommit }) => {
		const header = await instance.getBlockHeaderData(0);

		assert.defined(header);
		assert.equal(header!.hash, genesisCommit.block.hash);
	});

	it("getCommitData returns the genesis commit", async ({ instance }) => {
		assert.defined(await instance.getCommitData(0));
	});

	it("exposes every committed transaction by hash and key", async ({ instance, genesisCommit }) => {
		const [transaction] = genesisCommit.block.transactions;

		const key = await instance.getTransactionKeyByHash(transaction.hash);
		assert.defined(key);
		assert.defined(await instance.getTransactionData(key!));
	});

	it("stores one receipt per committed transaction", async ({ instance, genesisCommit }) => {
		const receipts = await instance.getReceiptsByBlockNumber(0n);

		assert.equal(Object.keys(receipts).length, genesisCommit.block.transactions.length);
	});

	it("getReceipts returns the committed receipts", async ({ instance, genesisCommit }) => {
		const { receipts } = await instance.getReceipts(0n, BigInt(genesisCommit.block.transactions.length + 1));

		assert.equal(receipts.length, genesisCommit.block.transactions.length);
	});

	it("getReceipt returns a single committed receipt by hash", async ({ instance, genesisCommit }) => {
		const [transaction] = genesisCommit.block.transactions;

		assert.defined(await instance.getReceipt(0n, transaction.hash));
	});

	it("funds the genesis proposer account", async ({ instance, genesisCommit }) => {
		const info = await instance.getAccountInfo(genesisCommit.block.proposer);

		assert.true(info.balance > 0n);
	});

	it("getAccounts returns the committed accounts", async ({ instance }) => {
		const { accounts } = await instance.getAccounts(0n, 1000n);

		assert.equal(accounts.length, 55); // initial wallet, validators 0x1;
	});
});
