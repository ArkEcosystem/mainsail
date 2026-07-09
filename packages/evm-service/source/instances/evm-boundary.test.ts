import { randomBytes } from "node:crypto";

import { Enums } from "@mainsail/constants";
import type { Contracts } from "@mainsail/contracts";
import { Evm } from "@mainsail/evm";
import { Application } from "@mainsail/kernel";
import { setGracefulCleanup } from "tmp";
import { zeroAddress, zeroHash } from "viem";

import { describe } from "@mainsail/test-runner";
import { wallets } from "../../test/fixtures/wallets";
import { commitGenesis, processGenesis } from "../../test/helpers/commit-genesis";
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

	it("process rejects an unknown commit key instead of fabricating a receipt", async ({ instance }) => {
		await assert.rejects(
			() =>
				instance.process({
					commitKey: { blockNumber: 99n, round: 0n },
					data: Buffer.alloc(0),
					from: wallets[0].address,
					gasLimit: 21_000n,
					gasPrice: 0n,
					nonce: 0n,
					specId: Enums.Evm.SpecId.SHANGHAI,
					to: wallets[1].address,
					txHash: randomBytes(32).toString("hex"),
					value: 0n,
				}),
			"unknown commit key",
		);
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

	it("rejects stale or unknown commit keys and bad sequencing with clean errors", async ({ app, instance }) => {
		const unknownKey = { blockNumber: 9n, round: 0n };

		await assert.rejects(
			() =>
				instance.updateRewardsAndVotes({
					blockReward: 0n,
					commitKey: unknownKey,
					specId: Enums.Evm.SpecId.SHANGHAI,
					timestamp: 0n,
					validatorAddress: zeroAddress,
				}),
			"genesis not initialized",
		);

		await assert.rejects(
			() =>
				instance.calculateRoundValidators({
					commitKey: unknownKey,
					roundValidators: 1n,
					specId: Enums.Evm.SpecId.SHANGHAI,
					timestamp: 0n,
					validatorAddress: zeroAddress,
				}),
			"calculate_round_validators is missing commit key",
		);

		await assert.rejects(
			() =>
				instance.importAccountInfos([
					{ address: wallets[0].address, balance: 0n, legacyAttributes: {}, nonce: 0n },
				]),
			"requires the genesis pending commit",
		);

		await processGenesis(app, instance);

		await assert.rejects(() => instance.stateRoot(unknownKey, zeroHash), "state_root is missing commit key");
		await assert.rejects(() => instance.logsBloom(unknownKey), "logs_bloom is missing commit key");

		const fresh = `0x${randomBytes(20).toString("hex")}`;
		await assert.rejects(
			() =>
				instance.importAccountInfos([
					{ address: fresh, balance: 0n, legacyAttributes: {}, nonce: 0n },
					{ address: fresh, balance: 1n, legacyAttributes: {}, nonce: 0n },
				]),
			"duplicate account",
		);
	});

	it("imports reject balances that do not fit into u128", async ({ app, instance }) => {
		await processGenesis(app, instance);

		const fresh = `0x${randomBytes(20).toString("hex")}`;
		await assert.rejects(
			() =>
				instance.importAccountInfos([{ address: fresh, balance: 2n ** 128n, legacyAttributes: {}, nonce: 0n }]),
			"does not fit into u128",
		);

		await assert.rejects(
			() =>
				instance.importLegacyColdWallets([
					{ address: "DJmvhhiQFSrEQCq9FUxvcLcpcBjx7K3yLt", balance: 2n ** 128n, legacyAttributes: {} },
				]),
			"does not fit into u128",
		);
	});

	it("process rejects a transaction hash that was already committed", async ({ app, instance }) => {
		const genesisCommit = await commitGenesis(app, instance);
		const transaction = genesisCommit.block.transactions[0];
		assert.defined(transaction);

		await assert.rejects(
			() =>
				instance.process({
					commitKey: { blockNumber: 0n, round: 0n },
					data: Buffer.alloc(0),
					from: transaction.from,
					gasLimit: 21_000n,
					gasPrice: 0n,
					nonce: 0n,
					specId: Enums.Evm.SpecId.SHANGHAI,
					to: wallets[1].address,
					txHash: transaction.hash,
					value: 0n,
				}),
			"already committed",
		);
	});

	it("rolls back the pending commit when a consensus contract call reverts", async ({ instance }) => {
		// The ERC20 fixture has no updateVoters/calculateRoundValidators and no fallback,
		// so pointing the "validator contract" at its (deterministic) deploy address makes
		// every consensus call revert.
		const validatorContract = "0x0c2485e7d05894BC4f4413c52B080b6D1eca122a"; // wallets[0], nonce 0
		await instance.initializeGenesis({
			account: wallets[0].address,
			deployerAccount: "0x0000000000000000000000000000000000000001",
			initialBlockNumber: 0n,
			initialSupply: 0n,
			timestamp: 0n,
			usernameContract: "0x0000000000000000000000000000000000000002",
			validatorContract,
		});

		// Block 1, not 0: at the genesis block number prepareNextCommit deliberately keeps
		// an existing pending commit (bootstrap guard), which would defeat the rebuild below.
		const commitKey = { blockNumber: 1n, round: 0n };
		await instance.prepareNextCommit({
			blockContext: { commitKey, gasLimit: 10_000_000n, timestamp: 12_345n, validatorAddress: zeroAddress },
		});

		const { receipt } = await instance.process({
			commitKey,
			data: Buffer.from(MainsailERC20.bytecode.slice(2), "hex"),
			from: wallets[0].address,
			gasLimit: 1_000_000n,
			gasPrice: 0n,
			nonce: 0n,
			specId: Enums.Evm.SpecId.SHANGHAI,
			txHash: randomBytes(32).toString("hex"),
			value: 0n,
		});
		assert.equal(receipt.status, 1);
		assert.equal(receipt.contractAddress, validatorContract);

		await assert.rejects(
			() =>
				instance.calculateRoundValidators({
					commitKey,
					roundValidators: 1n,
					specId: Enums.Evm.SpecId.SHANGHAI,
					timestamp: 12_345n,
					validatorAddress: wallets[1].address,
				}),
			"calculate_round_validators reverted",
		);

		const reward = 1_000_000n;
		await assert.rejects(
			() =>
				instance.updateRewardsAndVotes({
					blockReward: reward,
					commitKey,
					specId: Enums.Evm.SpecId.SHANGHAI,
					timestamp: 12_345n,
					validatorAddress: wallets[1].address,
				}),
			"vote_update reverted",
		);

		// The failed block is never reused: the processor re-enters via prepareNextCommit,
		// which replaces the dirty pending commit with a fresh one. The applied-then-
		// abandoned reward must not survive that — spending it fails.
		await instance.prepareNextCommit({
			blockContext: { commitKey, gasLimit: 10_000_000n, timestamp: 12_345n, validatorAddress: zeroAddress },
		});

		await assert.rejects(() =>
			instance.process({
				commitKey,
				data: Buffer.alloc(0),
				from: wallets[1].address,
				gasLimit: 21_000n,
				gasPrice: 0n,
				nonce: 0n,
				specId: Enums.Evm.SpecId.SHANGHAI,
				to: wallets[0].address,
				txHash: randomBytes(32).toString("hex"),
				value: reward,
			}),
		);
	});
});
