import type { Contracts } from "@mainsail/contracts";

import { InvalidTransactionsLength } from "@mainsail/exceptions";
import { describe } from "@mainsail/test-runner";

import { TransactionsLengthVerifier } from "./transactions-length-verifier.js";

describe<{
	verifier: TransactionsLengthVerifier;
}>("TransactionsLengthVerifier", ({ it, beforeEach, assert }) => {
	const makeUnit = (transactionsCount: number, transactions: number) =>
		({
			getBlock: () => ({ hash: "b", transactions: Array.from({ length: transactions }), transactionsCount }),
		}) as unknown as Contracts.Processor.ProcessableUnit;

	beforeEach((context) => {
		context.verifier = new TransactionsLengthVerifier();
	});

	it("should accept a block without transactions", async ({ verifier }) => {
		await verifier.execute(makeUnit(0, 0));
	});

	it("should accept a block carrying as many transactions as it declares", async ({ verifier }) => {
		await verifier.execute(makeUnit(2, 2));
	});

	it("should reject a block carrying fewer transactions than it declares", async ({ verifier }) => {
		await assert.rejects(
			() => verifier.execute(makeUnit(2, 1)),
			InvalidTransactionsLength,
			"Expected 2, but got 1.",
		);
	});

	it("should reject a block carrying more transactions than it declares", async ({ verifier }) => {
		await assert.rejects(
			() => verifier.execute(makeUnit(1, 2)),
			InvalidTransactionsLength,
			"Expected 1, but got 2.",
		);
	});
});
