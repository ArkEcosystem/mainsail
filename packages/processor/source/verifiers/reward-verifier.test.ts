import type { Contracts } from "@mainsail/contracts";

import { Identifiers } from "@mainsail/constants";
import { InvalidReward } from "@mainsail/exceptions";
import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";

import { RewardVerifier } from "./reward-verifier.js";

describe<{
	app: Application;
	configuration: any;
	verifier: RewardVerifier;
}>("RewardVerifier", ({ it, beforeEach, assert, spy }) => {
	const makeUnit = (block: Partial<Contracts.Crypto.Block>) =>
		({ getBlock: () => block }) as Contracts.Processor.ProcessableUnit;

	beforeEach((context) => {
		context.configuration = { getMilestone: () => ({ reward: "2000000000" }) };

		context.app = new Application();
		context.app.bind(Identifiers.Cryptography.Configuration).toConstantValue(context.configuration);

		context.verifier = context.app.resolve(RewardVerifier);
	});

	it("should accept a block carrying the reward of its milestone", async ({ configuration, verifier }) => {
		const getMilestone = spy(configuration, "getMilestone");

		await verifier.execute(makeUnit({ hash: "b", number: 3, reward: 2_000_000_000n }));

		getMilestone.calledWith(3);
	});

	it("should accept a zero reward when the milestone pays none", async ({ configuration, verifier }) => {
		configuration.getMilestone = () => ({ reward: "0" });

		await verifier.execute(makeUnit({ hash: "g", number: 0, reward: 0n }));
	});

	it("should reject a block with another reward", async ({ verifier }) => {
		await assert.rejects(
			() => verifier.execute(makeUnit({ hash: "b", number: 3, reward: 1n })),
			InvalidReward,
			"Block reward is 1 instead 2000000000.",
		);
	});
});
