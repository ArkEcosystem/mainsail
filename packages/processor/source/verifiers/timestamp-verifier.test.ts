import type { Contracts } from "@mainsail/contracts";

import { Identifiers } from "@mainsail/constants";
import { InvalidTimestamp } from "@mainsail/exceptions";
import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";

import { TimestampVerifier } from "./timestamp-verifier.js";

describe<{
	app: Application;
	configuration: any;
	store: any;
	timestampCalculator: any;
	verifier: TimestampVerifier;
}>("TimestampVerifier", ({ it, beforeEach, assert, spy }) => {
	const previousBlock = { hash: "parent", number: 2, timestamp: 900 };

	const makeUnit = (block: Partial<Contracts.Crypto.Block>) =>
		({ getBlock: () => block }) as Contracts.Processor.ProcessableUnit;

	beforeEach((context) => {
		context.configuration = { getGenesisHeight: () => 0 };
		context.store = { getLastBlock: () => previousBlock };
		context.timestampCalculator = { calculateMinimalTimestamp: () => 1000 };

		context.app = new Application();
		context.app.bind(Identifiers.State.Store).toConstantValue(context.store);
		context.app.bind(Identifiers.Cryptography.Configuration).toConstantValue(context.configuration);
		context.app.bind(Identifiers.BlockchainUtils.TimestampCalculator).toConstantValue(context.timestampCalculator);

		context.verifier = context.app.resolve(TimestampVerifier);
	});

	it("should skip the genesis block", async ({ timestampCalculator, verifier }) => {
		const calculateMinimalTimestamp = spy(timestampCalculator, "calculateMinimalTimestamp");

		await verifier.execute(makeUnit({ hash: "g", number: 0, round: 0, timestamp: 0 }));

		calculateMinimalTimestamp.neverCalled();
	});

	it("should accept a block at the minimal timestamp of its round", async ({ timestampCalculator, verifier }) => {
		const calculateMinimalTimestamp = spy(timestampCalculator, "calculateMinimalTimestamp");

		await verifier.execute(makeUnit({ hash: "b", number: 3, round: 2, timestamp: 1000 }));

		calculateMinimalTimestamp.calledWith(previousBlock, 2);
	});

	it("should accept a block after the minimal timestamp", async ({ verifier }) => {
		await verifier.execute(makeUnit({ hash: "b", number: 3, round: 2, timestamp: 5000 }));
	});

	it("should reject a block before the minimal timestamp", async ({ verifier }) => {
		await assert.rejects(
			() => verifier.execute(makeUnit({ hash: "b", number: 3, round: 2, timestamp: 999 })),
			InvalidTimestamp,
			"Block b timestamp is too low.",
		);
	});
});
