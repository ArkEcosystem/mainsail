import type { Contracts } from "@mainsail/contracts";

import { Identifiers } from "@mainsail/constants";
import { BlockNotChained } from "@mainsail/exceptions";
import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";

import { ChainedVerifier } from "./chained-verifier.js";

const ZERO_HASH = "0".repeat(64);
const SNAPSHOT_PARENT_HASH = "a".repeat(64);

describe<{
	app: Application;
	verifier: ChainedVerifier;
	configuration: any;
	store: any;
}>("ChainedVerifier", ({ it, beforeEach, assert }) => {
	const makeUnit = (block: Partial<Contracts.Crypto.Block>) =>
		({ getBlock: () => block }) as Contracts.Processor.ProcessableUnit;

	beforeEach((context) => {
		context.configuration = {
			getGenesisHeight: () => 0,
			getMilestone: () => ({}),
		};

		context.store = {
			getLastBlock: () => ({ hash: "1", number: 1, timestamp: 2 }),
		};

		context.app = new Application();
		context.app.bind(Identifiers.Cryptography.Configuration).toConstantValue(context.configuration);
		context.app.bind(Identifiers.State.Store).toConstantValue(context.store);

		context.verifier = context.app.resolve(ChainedVerifier);
	});

	it("should accept a genesis block with a zero parent hash", async ({ verifier }) => {
		await verifier.execute(makeUnit({ hash: "g", number: 0, parentHash: ZERO_HASH }));
	});

	it("should accept a genesis block chained to the snapshot's previous genesis block", async ({
		verifier,
		configuration,
	}) => {
		configuration.getMilestone = () => ({
			snapshot: { previousGenesisBlockHash: SNAPSHOT_PARENT_HASH, snapshotHash: "b".repeat(64) },
		});

		await verifier.execute(makeUnit({ hash: "g", number: 0, parentHash: SNAPSHOT_PARENT_HASH }));
	});

	it("should take the genesis height from the configuration", async ({ verifier, configuration }) => {
		configuration.getGenesisHeight = () => 1000;

		await verifier.execute(makeUnit({ hash: "g", number: 1000, parentHash: ZERO_HASH }));
	});

	it("should reject a genesis block with an unexpected parent hash", async ({ verifier }) => {
		await assert.rejects(
			() => verifier.execute(makeUnit({ hash: "g", number: 0, parentHash: "1" })),
			BlockNotChained,
			`genesis parent hash 1 does not match expected ${ZERO_HASH}`,
		);
	});

	it("should reject a genesis block that is not chained to the snapshot's previous genesis block", async ({
		verifier,
		configuration,
	}) => {
		configuration.getMilestone = () => ({
			snapshot: { previousGenesisBlockHash: SNAPSHOT_PARENT_HASH, snapshotHash: "b".repeat(64) },
		});

		await assert.rejects(
			() => verifier.execute(makeUnit({ hash: "g", number: 0, parentHash: ZERO_HASH })),
			`genesis parent hash ${ZERO_HASH} does not match expected ${SNAPSHOT_PARENT_HASH}`,
		);
	});

	it("should accept a block that follows the last block, whatever its timestamp", async ({ verifier }) => {
		for (const timestamp of [1, 2, 3]) {
			await verifier.execute(makeUnit({ hash: "2", number: 2, parentHash: "1", timestamp }));
		}
	});

	it("should reject a block whose parent hash is not the last block hash", async ({ verifier }) => {
		await assert.rejects(
			() => verifier.execute(makeUnit({ hash: "2", number: 2, parentHash: "x" })),
			BlockNotChained,
			"Block 2 is not chained: parent hash x does not match previous block hash 1",
		);
	});

	it("should reject a block whose number does not follow the last block number", async ({ verifier }) => {
		await assert.rejects(
			() => verifier.execute(makeUnit({ hash: "2", number: 3, parentHash: "1" })),
			BlockNotChained,
			"Block 2 is not chained: number 3 does not follow previous block number 1",
		);
	});

	it("should report the parent hash first when both the hash and the number differ", async ({ verifier }) => {
		await assert.rejects(
			() => verifier.execute(makeUnit({ hash: "3", number: 3, parentHash: "2" })),
			"parent hash 2 does not match previous block hash 1",
		);
	});
});
