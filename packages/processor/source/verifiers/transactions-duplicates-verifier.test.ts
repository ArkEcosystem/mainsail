import type { Contracts } from "@mainsail/contracts";

import { DuplicatedTransaction } from "@mainsail/exceptions";
import { describe } from "@mainsail/test-runner";

import { TransactionsDuplicatesVerifier } from "./transactions-duplicates-verifier.js";

describe<{
	verifier: TransactionsDuplicatesVerifier;
}>("TransactionsDuplicatesVerifier", ({ it, beforeEach, assert }) => {
	const makeUnit = (hashes: string[]) =>
		({
			getBlock: () => ({ hash: "b", transactions: hashes.map((hash) => ({ hash })) }),
		}) as unknown as Contracts.Processor.ProcessableUnit;

	beforeEach((context) => {
		context.verifier = new TransactionsDuplicatesVerifier();
	});

	it("should accept a block without transactions", async ({ verifier }) => {
		await verifier.execute(makeUnit([]));
	});

	it("should accept a block with distinct transactions", async ({ verifier }) => {
		await verifier.execute(makeUnit(["hash-1", "hash-2", "hash-3"]));
	});

	it("should reject a block containing the same transaction twice", async ({ verifier }) => {
		await assert.rejects(
			() => verifier.execute(makeUnit(["hash-1", "hash-2", "hash-1"])),
			DuplicatedTransaction,
			"Block b has duplicated transaction hash-1.",
		);
	});
});
