import { describe } from "@mainsail/test-runner";

import { RoundVerifier } from "./round-verifier.js";

describe<{
	verifier: RoundVerifier;
}>("RoundVerifier", ({ it, beforeEach, assert }) => {
	const makeUnit = (blockRound: number, round: number) => ({
		getBlock: () => ({ hash: "c".repeat(64), round: blockRound }),
		round,
	});

	beforeEach((context) => {
		context.verifier = new RoundVerifier();
	});

	it("should accept a block forged in the round of the unit", async ({ verifier }) => {
		await verifier.execute(makeUnit(2, 2));
	});

	it("should accept a block forged in an earlier round, as a re-proposal or a commit carries", async ({
		verifier,
	}) => {
		await verifier.execute(makeUnit(1, 4));
	});

	it("should reject a block whose round is ahead of the unit", async ({ verifier }) => {
		await assert.rejects(() => verifier.execute(makeUnit(3, 2)), "has round 3, which is ahead of round 2");
	});
});
