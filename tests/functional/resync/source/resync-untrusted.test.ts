import type { Contracts } from "@mainsail/contracts";
import { Identifiers } from "@mainsail/constants";
import { describe } from "@mainsail/test-runner";
import { EvmCalls, Utils } from "@mainsail/test-transaction-builders";
import { dirSync } from "tmp";

import { verifyNodeIntegrity } from "./integrity.js";
import { UntrustedTokenMode, untrustedTokenDeployment, nulRevertDeployment } from "./untrusted-contracts.js";
import { runDatabaseQuery, setupSyncNode, shutdown } from "./setup.js";
import { getWallets, waitForApiSync } from "./utilities.js";

// Block commit waits for api-sync. Each test asserts that the transaction was synced: tokens are stored in the same
// database transaction, so a missing token row means the token was skipped, not that the sync failed.
describe<{
	syncNode: Contracts.Kernel.Application;
	dataDirectory: string;
}>("Resync Untrusted", ({ beforeEach, afterEach, it, assert }) => {
	const query = async (syncNode: Contracts.Kernel.Application, sql: string, parameters: unknown[]) =>
		runDatabaseQuery(syncNode.get<string>(Identifiers.Application.Name), (dataSource) =>
			dataSource.query(sql, parameters),
		);

	const deployAndSync = async (
		syncNode: Contracts.Kernel.Application,
		payload?: string,
	): Promise<{ hash: string; status: number; decoded_error: string | null }> => {
		const context = { app: syncNode, wallets: await getWallets(syncNode) };
		const tx = await EvmCalls.makeEvmCallDeployErc20Contract(context, { payload });

		await syncNode
			.get<Contracts.TransactionPool.Processor>(Identifiers.TransactionPool.Processor)
			.process([tx.serialized]);
		await Utils.waitBlock(context);
		await waitForApiSync(syncNode);

		const [row] = await query(syncNode, "SELECT hash, status, decoded_error FROM transactions WHERE hash = $1", [
			tx.hash,
		]);
		assert.defined(row);

		return row;
	};

	const tokenOf = async (syncNode: Contracts.Kernel.Application, deploymentHash: string) => {
		const [row] = await query(
			syncNode,
			"SELECT address, name, symbol, decimals FROM tokens WHERE deployment_hash = $1",
			[deploymentHash],
		);
		return row;
	};

	beforeEach(async (context) => {
		const dataDirectory = dirSync({ unsafeCleanup: true }).name;

		context.dataDirectory = dataDirectory;
		context.syncNode = await setupSyncNode(dataDirectory);
	});

	afterEach(async ({ syncNode }) => {
		if (syncNode) {
			await shutdown(syncNode);
		}
	});

	it("should index a standard ERC20 token and its holder", async ({ syncNode }) => {
		const { hash, status } = await deployAndSync(syncNode);
		const deployer = await Utils.getAddressByPublicKey(
			{ app: syncNode },
			(await getWallets(syncNode))[0].publicKey,
		);

		const token = await tokenOf(syncNode, hash);
		const [holder] = await query(
			syncNode,
			"SELECT balance FROM token_holders WHERE token_address = $1 AND address = $2",
			[token?.address, deployer],
		);

		assert.equal(status, 1);
		assert.equal(
			{ decimals: token?.decimals, name: token?.name, symbol: token?.symbol },
			{ decimals: 18, name: "DARK20", symbol: "DARK20" },
		);
		assert.equal(holder?.balance, "100000000000000000000000000");
	});

	it("should index a token whose metadata is valid", async ({ syncNode }) => {
		const { hash, status } = await deployAndSync(syncNode, untrustedTokenDeployment(UntrustedTokenMode.Valid));

		const token = await tokenOf(syncNode, hash);

		assert.equal(status, 1);
		assert.equal(
			{ decimals: token?.decimals, name: token?.name, symbol: token?.symbol },
			{ decimals: 18, name: "Test Token", symbol: "TST" },
		);
	});

	it("should sync a transaction that reverts with a NUL reason", async ({ syncNode }) => {
		const { decoded_error, status } = await deployAndSync(syncNode, nulRevertDeployment());

		assert.equal(status, 0);
		assert.equal(decoded_error, "execution reverted");
	});

	it("should sync but not index a token with NUL bytes in its name and symbol", async ({ syncNode }) => {
		const { hash, status } = await deployAndSync(
			syncNode,
			untrustedTokenDeployment(UntrustedTokenMode.NulMetadata),
		);

		assert.equal(status, 1);
		assert.undefined(await tokenOf(syncNode, hash));
	});

	it("should sync but not index a token whose symbol exceeds 64 characters", async ({ syncNode }) => {
		const { hash, status } = await deployAndSync(syncNode, untrustedTokenDeployment(UntrustedTokenMode.LongSymbol));

		assert.equal(status, 1);
		assert.undefined(await tokenOf(syncNode, hash));
	});

	it("should sync but not index a token whose decimals exceed a uint8", async ({ syncNode }) => {
		const { hash, status } = await deployAndSync(
			syncNode,
			untrustedTokenDeployment(UntrustedTokenMode.HugeDecimals),
		);

		assert.equal(status, 1);
		assert.undefined(await tokenOf(syncNode, hash));
	});

	it("should sync but not index a token whose name() exhausts gas", async ({ syncNode }) => {
		const { hash, status } = await deployAndSync(
			syncNode,
			untrustedTokenDeployment(UntrustedTokenMode.EndlessName),
		);

		assert.equal(status, 1);
		assert.undefined(await tokenOf(syncNode, hash));
	});

	it("should restore the same data after untrusted transactions", async ({ syncNode, dataDirectory }) => {
		await deployAndSync(syncNode, nulRevertDeployment());
		for (const mode of [
			UntrustedTokenMode.NulMetadata,
			UntrustedTokenMode.HugeDecimals,
			UntrustedTokenMode.LongSymbol,
			UntrustedTokenMode.EndlessName,
			UntrustedTokenMode.Valid,
		]) {
			await deployAndSync(syncNode, untrustedTokenDeployment(mode));
		}

		await verifyNodeIntegrity(assert, syncNode, dataDirectory);
	});
});
