import type { Contracts } from "@mainsail/contracts";

import { Identifiers } from "@mainsail/constants";
import { ExceededGasLimit } from "@mainsail/exceptions";
import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";

import { GasLimitVerifier } from "./gas-limit-verifier.js";

describe<{
	app: Application;
	configuration: any;
	verifier: GasLimitVerifier;
}>("GasLimitVerifier", ({ it, beforeEach, assert, spy }) => {
	const makeUnit = (block: Partial<Contracts.Crypto.Block>) =>
		({ getBlock: () => block }) as Contracts.Processor.ProcessableUnit;

	beforeEach((context) => {
		context.configuration = {
			getGenesisHeight: () => 0,
			getMilestone: () => ({ block: { maxGasLimit: 100_000 } }),
		};

		context.app = new Application();
		context.app.bind(Identifiers.Cryptography.Configuration).toConstantValue(context.configuration);

		context.verifier = context.app.resolve(GasLimitVerifier);
	});

	it("should skip the genesis block", async ({ configuration, verifier }) => {
		const getMilestone = spy(configuration, "getMilestone");

		await verifier.execute(makeUnit({ gasUsed: 1_000_000, hash: "g", number: 0 }));

		getMilestone.neverCalled();
	});

	it("should accept a block within the gas limit", async ({ verifier }) => {
		await verifier.execute(makeUnit({ gasUsed: 99_999, hash: "b", number: 3 }));
	});

	it("should accept a block using exactly the gas limit", async ({ verifier }) => {
		await verifier.execute(makeUnit({ gasUsed: 100_000, hash: "b", number: 3 }));
	});

	it("should take the gas limit from the milestone of the block", async ({ configuration, verifier }) => {
		const getMilestone = spy(configuration, "getMilestone");

		await verifier.execute(makeUnit({ gasUsed: 0, hash: "b", number: 3 }));

		getMilestone.calledWith(3);
	});

	it("should reject a block exceeding the gas limit", async ({ verifier }) => {
		await assert.rejects(
			() => verifier.execute(makeUnit({ gasUsed: 100_001, hash: "b", number: 3 })),
			ExceededGasLimit,
			"exceeds max gas limit of 100000",
		);
	});
});
