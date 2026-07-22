import { randomBytes } from "node:crypto";

import { Enums, Identifiers } from "@mainsail/constants";
import type { Contracts } from "@mainsail/contracts";
import { Evm } from "@mainsail/evm";
import { Application } from "@mainsail/kernel";
import { setGracefulCleanup } from "tmp";
import { zeroAddress, zeroHash } from "viem";

import { describe } from "@mainsail/test-runner";
import { wallets } from "../../test/fixtures/wallets";
import { commitGenesis, processGenesis } from "../../test/helpers/commit-genesis";
import { prepareSandbox } from "../../test/helpers/prepare-sandbox";
import * as MainsailERC20 from "../../test/fixtures/MainsailERC20.json";
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

	// Valid legacy (base58check) addresses: one imported as a cold wallet by the tests
	// below, and one nothing is ever imported under.
	const coldWalletAddress = "DJmvhhiQFSrEQCq9FUxvcLcpcBjx7K3yLt";
	const unknownLegacyAddress = "DBcN6tLzebNYT9oAfXtUYS7WhSTfcfM19C";

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

	it("serves byte-identical commits from storage (the block-sync path)", async ({ app, instance }) => {
		const genesisCommit = await commitGenesis(app, instance);

		const stored = await instance.getCommitData(0);
		assert.defined(stored);

		const commitFactory = app.get<Contracts.Crypto.CommitFactory>(Identifiers.Cryptography.Commit.Factory);
		const restored = await commitFactory.fromStorage(stored!);

		assert.equal(restored.serialized, genesisCommit.serialized);
	});

	it("stores and returns transaction r/s verbatim, including leading zeros", async ({ app, instance }) => {
		const { genesisCommit } = await processGenesis(app, instance);
		const transaction = genesisCommit.block.transactions[0];
		assert.defined(transaction);

		const mutable = transaction as unknown as Record<"r" | "s", string>;

		// r/s are always exactly 32 bytes, leading zeros included (the ECDSA signer pads,
		// and RLP carries them as 32-byte strings). ~1 in 128 transactions has a leading
		// zero byte in r or s — those bytes must survive the storage round-trip, or the
		// re-serialized block served to syncing peers differs from the original.
		const r = "00" + "ab".repeat(31);
		const s = "00".repeat(24) + "0123456789abcdef";
		mutable.r = r;
		mutable.s = s;

		await instance.onCommit(makeUnit(genesisCommit));

		const key = await instance.getTransactionKeyByHash(transaction.hash);
		assert.defined(key);
		const data = await instance.getTransactionData(key!);
		assert.defined(data);
		assert.equal(data!.r, r);
		assert.equal(data!.s, s);
	});

	it("onCommit rejects r/s that are not exactly 32 bytes", async ({ app, instance }) => {
		const { genesisCommit } = await processGenesis(app, instance);
		const transaction = genesisCommit.block.transactions[0];
		assert.defined(transaction);

		const mutable = transaction as unknown as Record<"r", string>;

		// The honest pipeline can never produce these; a doctored payload must not be
		// silently normalized into different bytes.
		mutable.r = "ab".repeat(31); // 31 bytes
		await assert.rejects(() => instance.onCommit(makeUnit(genesisCommit)), "expected exactly 32 bytes");
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
				`${field}: expected an unsigned bigint`,
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
			"balance: expected an unsigned bigint",
		);
	});

	it("rejects stale or unknown commit keys and bad sequencing with clean errors", async ({ app, instance }) => {
		const unknownKey = { blockNumber: 9n, round: 0n };
		const updateContext = {
			blockReward: 0n,
			commitKey: unknownKey,
			specId: Enums.Evm.SpecId.SHANGHAI,
			timestamp: 0n,
			validatorAddress: zeroAddress,
		};

		await assert.rejects(() => instance.updateRewardsAndVotes(updateContext), "genesis not initialized");

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
				instance.updateValidatorRegistrationFee({
					commitKey: unknownKey,
					fee: 0n,
					specId: Enums.Evm.SpecId.SHANGHAI,
					timestamp: 0n,
					validatorAddress: zeroAddress,
				}),
			"update_validator_registration_fee is missing commit key",
		);

		await assert.rejects(
			() =>
				instance.importAccountInfos([
					{ address: wallets[0].address, balance: 0n, legacyAttributes: {}, nonce: 0n },
				]),
			"requires the genesis pending commit",
		);

		await assert.rejects(
			() => instance.importLegacyColdWallets([{ address: coldWalletAddress, balance: 0n, legacyAttributes: {} }]),
			"requires the genesis pending commit",
		);

		await processGenesis(app, instance);

		// With genesis in place the unknown key is what fails.
		await assert.rejects(
			() => instance.updateRewardsAndVotes(updateContext),
			"update_rewards_and_votes is missing commit key",
		);

		await assert.rejects(() => instance.stateRoot(unknownKey, zeroHash), "state_root is missing commit key");
		await assert.rejects(() => instance.logsBloom(unknownKey), "logs_bloom is missing commit key");

		await assert.rejects(() => instance.snapshot(unknownKey), "snapshot is missing commit key");

		const fresh = `0x${randomBytes(20).toString("hex")}`;
		await assert.rejects(
			() =>
				instance.importAccountInfos([
					{ address: fresh, balance: 0n, legacyAttributes: {}, nonce: 0n },
					{ address: fresh, balance: 1n, legacyAttributes: {}, nonce: 0n },
				]),
			"duplicate account",
		);

		await assert.rejects(
			() =>
				instance.importLegacyColdWallets([
					{ address: coldWalletAddress, balance: 0n, legacyAttributes: {} },
					{ address: coldWalletAddress, balance: 1n, legacyAttributes: {} },
				]),
			"duplicate wallet",
		);

		// roundValidators is a u8 on the wire; anything wider fails argument conversion.
		await assert.rejects(
			() =>
				instance.calculateRoundValidators({
					commitKey: unknownKey,
					roundValidators: 300n,
					specId: Enums.Evm.SpecId.SHANGHAI,
					timestamp: 0n,
					validatorAddress: zeroAddress,
				}),
			"out of range",
		);

		// The fee is a u128 on the wire; negative or wider values fail argument conversion
		// instead of being silently truncated.
		for (const fee of [-1n, 2n ** 128n]) {
			await assert.rejects(
				() =>
					instance.updateValidatorRegistrationFee({
						commitKey: unknownKey,
						fee,
						specId: Enums.Evm.SpecId.SHANGHAI,
						timestamp: 0n,
						validatorAddress: zeroAddress,
					}),
				"fee: expected an unsigned bigint fitting into 128 bits",
			);
		}
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
			// A reverted system call surfaces as a rejection carrying the EVM error, not a panic.
			"calculate_round_validators reverted",
		);

		await assert.rejects(
			() =>
				instance.updateValidatorRegistrationFee({
					commitKey,
					fee: 250n,
					specId: Enums.Evm.SpecId.SHANGHAI,
					timestamp: 12_345n,
					validatorAddress: wallets[1].address,
				}),
			"update_validator_registration_fee reverted",
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

		await assert.rejects(
			() =>
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
			"lack of funds",
		);
	});

	it("serves receipts and commits by block range and rejects invalid ranges", async ({ app, instance }) => {
		const genesisCommit = await commitGenesis(app, instance);

		const { receipts } = await instance.getReceiptsByBlockRange(0n, 0n);
		assert.equal(receipts.length, genesisCommit.block.transactions.length);

		const empty = await instance.getReceiptsByBlockRange(5n, 9n);
		assert.equal(empty.receipts.length, 0);

		await assert.rejects(() => instance.getReceiptsByBlockRange(3n, 1n), "must be <= to_block_number");

		const commits = await instance.getCommitsByBlockRange(0, 0, 10_000_000);
		assert.equal(commits.length, 1);
		assert.equal(commits[0], (await instance.getCommitData(0))!);

		assert.equal(await instance.getCommitsByBlockRange(1, 5, 10_000_000), []);

		await assert.rejects(() => instance.getCommitsByBlockRange(0, 0, 0), "max_bytes");
	});

	it("returns legacy attributes from accounts and falls back to cold wallets", async ({ app, instance }) => {
		const { commitKey, genesisCommit } = await processGenesis(app, instance);

		// Fresh addresses, untouched by genesis transactions (imports reject duplicates).
		const imported = "0x1111111111111111111111111111111111111111";
		const stranger = "0x2222222222222222222222222222222222222222";

		const multiSignature = { min: 2, publicKeys: ["first-public-key", "second-public-key"] };

		await instance.importAccountInfos([
			{
				address: imported,
				balance: 0n,
				legacyAttributes: { legacyNonce: 7n, multiSignature, secondPublicKey: "second-public-key" },
				nonce: 0n,
			},
		]);
		await instance.importLegacyColdWallets([
			{ address: coldWalletAddress, balance: 123n, legacyAttributes: { legacyNonce: 3n } },
		]);

		// Re-preparing the exact genesis commit key (including the block hash) must keep
		// the pending bootstrap commit — and with it the imports above — instead of
		// replacing it like every other re-prepare (the deliberate genesis exception).
		await instance.prepareNextCommit({
			blockContext: {
				commitKey,
				gasLimit: 10_000_000n,
				timestamp: BigInt(genesisCommit.block.timestamp),
				validatorAddress: genesisCommit.block.proposer,
			},
		});

		await instance.onCommit(makeUnit(genesisCommit));

		// Attributes imported on the account itself round-trip, including multi-signature.
		const direct = await instance.getLegacyAttributes(imported);
		assert.defined(direct);
		assert.equal(direct!.legacyNonce, 7n);
		assert.equal(direct!.secondPublicKey, "second-public-key");
		assert.equal(direct!.multiSignature, multiSignature);

		// No account attributes: falls back to the cold wallet keyed by the legacy address.
		const fallback = await instance.getLegacyAttributes(stranger, coldWalletAddress);
		assert.defined(fallback);
		assert.equal(fallback!.legacyNonce, 3n);

		assert.undefined(await instance.getLegacyAttributes(stranger));

		// The extended account view uses the same cold-wallet fallback.
		const extended = await instance.getAccountInfoExtended(stranger, coldWalletAddress);
		assert.equal(extended.legacyAttributes.legacyNonce, 3n);
	});

	it("merges a legacy cold wallet balance into the sender on first use", async ({ app, instance }) => {
		const { genesisCommit } = await processGenesis(app, instance);

		await instance.importLegacyColdWallets([
			{ address: coldWalletAddress, balance: 10n ** 18n, legacyAttributes: {} },
		]);
		await instance.onCommit(makeUnit(genesisCommit));

		const sender = "0x3333333333333333333333333333333333333333";
		const recipient = "0x4444444444444444444444444444444444444444";

		// Preverification resolves the legacy cold wallet but only validates intrinsic
		// gas — balance checks happen at process time. Well-formed passes...
		const preverify = (legacyAddress: string, gasLimit: bigint) =>
			instance.preverifyTransaction({
				blockGasLimit: 10_000_000n,
				data: Buffer.alloc(0),
				from: sender,
				gasLimit,
				gasPrice: 0n,
				legacyAddress,
				nonce: 0n,
				specId: Enums.Evm.SpecId.SHANGHAI,
				to: recipient,
				txHash: randomBytes(32).toString("hex"),
				value: 10n,
			});
		assert.equal(await preverify(coldWalletAddress, 21_000n), { initialGasUsed: 21_000n, success: true });

		// ...and a gas limit below the intrinsic cost fails, wallet or not.
		const failed = await preverify(unknownLegacyAddress, 1n);
		assert.false(failed.success);
		assert.true(failed.error!.includes("preverify failed"));

		const commitKey = { blockNumber: 1n, round: 0n };
		await instance.prepareNextCommit({
			blockContext: { commitKey, gasLimit: 10_000_000n, timestamp: 12_345n, validatorAddress: zeroAddress },
		});

		const transfer = (nonce: bigint, from: string, legacyAddress: string) =>
			instance.process({
				commitKey,
				data: Buffer.alloc(0),
				from,
				gasLimit: 21_000n,
				gasPrice: 0n,
				legacyAddress,
				nonce,
				specId: Enums.Evm.SpecId.SHANGHAI,
				to: recipient,
				txHash: randomBytes(32).toString("hex"),
				value: 10n,
			});

		// A transaction that fails after its merge was applied must roll the merge back:
		// the wallet stays mergeable, so the follow-up transaction still gets the funds.
		await assert.rejects(() => transfer(5n, sender, coldWalletAddress));

		// First use merges the cold-wallet balance into the pending commit.
		const first = await transfer(0n, sender, coldWalletAddress);
		assert.equal(first.receipt.status, 1);

		// Same sender again: the merge bookkeeping short-circuits the lookup.
		const second = await transfer(1n, sender, coldWalletAddress);
		assert.equal(second.receipt.status, 1);

		// Unknown legacy address: no wallet to merge, the transfer has no funds.
		await assert.rejects(
			() => transfer(0n, "0x5555555555555555555555555555555555555555", unknownLegacyAddress),
			"lack of funds",
		);
	});

	it("restores the snapshotted pending commit on rollback", async ({ instance }) => {
		await instance.initializeGenesis({
			account: wallets[0].address,
			deployerAccount: "0x0000000000000000000000000000000000000001",
			initialBlockNumber: 0n,
			initialSupply: 0n,
			timestamp: 0n,
			usernameContract: "0x0000000000000000000000000000000000000002",
			validatorContract: "0x0000000000000000000000000000000000000003",
		});

		const commitKey = { blockNumber: 1n, round: 0n };
		await instance.prepareNextCommit({
			blockContext: { commitKey, gasLimit: 10_000_000n, timestamp: 12_345n, validatorAddress: zeroAddress },
		});

		const deploy = (nonce: bigint) =>
			instance.process({
				commitKey,
				data: Buffer.from(MainsailERC20.bytecode.slice(2), "hex"),
				from: wallets[0].address,
				gasLimit: 2_000_000n,
				gasPrice: 0n,
				nonce,
				specId: Enums.Evm.SpecId.SHANGHAI,
				txHash: randomBytes(32).toString("hex"),
				value: 0n,
			});

		assert.equal((await deploy(0n)).receipt.status, 1);

		await instance.snapshot(commitKey);

		assert.equal((await deploy(1n)).receipt.status, 1);

		// A mismatching key must not consume the snapshot...
		await assert.rejects(() => instance.rollback({ blockNumber: 2n, round: 0n }), "rollback commit key mismatch");

		// ...so the rollback still succeeds and rewinds the sender nonce: re-processing
		// nonce 1 works again (without the rollback it would be a wrong-nonce error).
		await instance.rollback(commitKey);
		assert.equal((await deploy(1n)).receipt.status, 1);

		// The consumed snapshot is gone.
		await assert.rejects(() => instance.rollback(commitKey), "rollback to non-existent commit");
	});

	it("exposes state, account, code and storage getters", async ({ app, instance }) => {
		assert.true(await instance.isEmpty());

		await assert.rejects(
			() => instance.stateRoot({ blockNumber: 0n, round: 0n }, "00".repeat(32)),
			"genesis not initialized",
		);

		const genesisCommit = await commitGenesis(app, instance);
		assert.false(await instance.isEmpty());

		const state = await instance.getState();
		assert.equal(state.blockNumber, 0);

		// Latest and historical (block 0 is within the retention window) reads agree.
		const [funded] = genesisCommit.block.transactions;
		const latest = await instance.getAccountInfo(funded.from);
		const historical = await instance.getAccountInfo(funded.from, 0n);
		assert.equal(latest, historical);

		// Code and storage reads work for latest state and for historical block numbers
		// within the retention window (codeless accounts read as empty, storage as zero).
		assert.equal(await instance.codeAt(funded.from), "0x");
		assert.equal(await instance.codeAt(funded.from, 0n), "0x");
		assert.equal(await instance.storageAt(funded.from, 0n), `0x${"0".repeat(64)}`);

		// A view call that fails validation (gas limit below intrinsic cost) reports
		// failure instead of throwing.
		const view = await instance.view({
			data: Buffer.alloc(0),
			from: zeroAddress,
			gasLimit: 1n,
			specId: Enums.Evm.SpecId.SHANGHAI,
			to: zeroAddress,
		});
		assert.false(view.success);

		// Missing-key getters resolve to undefined rather than throwing.
		assert.undefined(await instance.getBlockHeaderData(99));
		assert.undefined(await instance.getBlockNumberByHash("11".repeat(32)));
		assert.undefined(await instance.getCommitData(99));
		assert.undefined(await instance.getTransactionKeyByHash("11".repeat(32)));
		assert.undefined((await instance.getReceipt(0n, "11".repeat(32))).receipt);
	});

	it("paginates accounts, receipts and legacy cold wallets with a continuation offset", async ({ app, instance }) => {
		const { genesisCommit } = await processGenesis(app, instance);

		await instance.importLegacyColdWallets([
			{ address: coldWalletAddress, balance: 1n, legacyAttributes: {} },
			{ address: unknownLegacyAddress, balance: 2n, legacyAttributes: {} },
		]);
		await instance.onCommit(makeUnit(genesisCommit));

		// A page smaller than the table returns a continuation offset; resuming from it
		// yields the next disjoint page.
		const accountsPage = await instance.getAccounts(0n, 1n);
		assert.defined(accountsPage.nextOffset);
		assert.equal(accountsPage.accounts.length, 1);
		const accountsNext = await instance.getAccounts(accountsPage.nextOffset!, 1n);
		assert.equal(accountsNext.accounts.length, 1);
		assert.not.equal(accountsNext.accounts[0].address, accountsPage.accounts[0].address);

		// Unlike its siblings, getReceipts paginates per *block*: a limit of 1 returns
		// every receipt of the first block, flattened.
		const receiptsPage = await instance.getReceipts(0n, 1n);
		assert.defined(receiptsPage.nextOffset);
		assert.equal(receiptsPage.receipts.length, genesisCommit.block.transactions.length);

		const walletsPage = await instance.getLegacyColdWallets(0n, 1n);
		assert.defined(walletsPage.nextOffset);
		assert.equal(walletsPage.wallets.length, 1);
		const walletsNext = await instance.getLegacyColdWallets(walletsPage.nextOffset!, 1n);
		assert.equal(walletsNext.wallets.length, 1);
		assert.not.equal(walletsNext.wallets[0].address, walletsPage.wallets[0].address);
	});

	it("simulates a contract deployment without a recipient", async ({ instance }) => {
		await instance.initializeGenesis({
			account: wallets[0].address,
			deployerAccount: "0x0000000000000000000000000000000000000001",
			initialBlockNumber: 0n,
			initialSupply: 0n,
			timestamp: 0n,
			usernameContract: "0x0000000000000000000000000000000000000002",
			validatorContract: "0x0000000000000000000000000000000000000003",
		});

		const { receipt } = await instance.simulate({
			blockContext: {
				commitKey: { blockNumber: 0n, round: 0n },
				gasLimit: 10_000_000n,
				timestamp: 12_345n,
				validatorAddress: zeroAddress,
			},
			data: Buffer.from(MainsailERC20.bytecode.slice(2), "hex"),
			from: wallets[0].address,
			gasLimit: 2_000_000n,
			gasPrice: 0n,
			nonce: 0n,
			specId: Enums.Evm.SpecId.SHANGHAI,
			value: 0n,
		});

		assert.equal(receipt.status, 1);
		assert.defined(receipt.contractAddress);

		// Simulation never persists: the deployed code is not visible afterwards.
		assert.equal(await instance.codeAt(receipt.contractAddress!), "0x");
	});

	it("rejects malformed hashes and unsupported spec ids at the argument boundary", async ({ app, instance }) => {
		// Not valid hex for a 32-byte hash, and valid hex of the wrong length.
		await assert.rejects(() => instance.getBlockNumberByHash("zz"));
		await assert.rejects(() => instance.getBlockNumberByHash("1122"));

		await assert.rejects(
			() =>
				instance.initializeGenesis({
					account: zeroAddress,
					deployerAccount: zeroAddress,
					initialBlockNumber: 2n ** 64n,
					initialSupply: 0n,
					timestamp: 0n,
					usernameContract: zeroAddress,
					validatorContract: zeroAddress,
				}),
			"initialBlockNumber: expected an unsigned bigint",
		);

		// A spec id revm parses but mainsail does not support, and one revm cannot parse.
		const viewWithSpec = (specId: string) =>
			instance.view({
				data: Buffer.alloc(0),
				from: zeroAddress,
				specId: specId as Contracts.Evm.SpecId,
				to: zeroAddress,
			});
		await assert.rejects(() => viewWithSpec("Prague"), "unsupported spec_id");
		await assert.rejects(() => viewWithSpec("PRAGUE"), "invalid spec_id");

		// A corrupted BLS proof signature in a commit rejects cleanly and the pending
		// commit stays sealable with the original value.
		const { genesisCommit } = await processGenesis(app, instance);
		const proof = genesisCommit.proof as unknown as Record<"signature", string>;
		const original = proof.signature;

		for (const bad of ["zz", "11"]) {
			proof.signature = bad;
			await assert.rejects(() => instance.onCommit(makeUnit(genesisCommit)));
		}

		proof.signature = original;
		await instance.onCommit(makeUnit(genesisCommit));
		assert.defined(await instance.getCommitData(0));
	});
});
