import type { Contracts } from "@mainsail/contracts";

import { Identifiers } from "@mainsail/constants";
import { InvalidTransactionsRoot } from "@mainsail/exceptions";
import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";

import { TransactionsRootVerifier } from "./transactions-root-verifier.js";

const hash1 = "11".repeat(32);
const hash2 = "22".repeat(32);
const root = "dd".repeat(32);

describe<{
	app: Application;
	hashFactory: any;
	verifier: TransactionsRootVerifier;
}>("TransactionsRootVerifier", ({ it, beforeEach, assert, spy }) => {
	const makeUnit = (transactionsRoot: string, hashes: string[]) =>
		({
			getBlock: () => ({ hash: "b", transactions: hashes.map((hash) => ({ hash })), transactionsRoot }),
		}) as unknown as Contracts.Processor.ProcessableUnit;

	beforeEach((context) => {
		context.hashFactory = { sha256: () => Buffer.from(root, "hex") };

		context.app = new Application();
		context.app.bind(Identifiers.Cryptography.Hash.Factory).toConstantValue(context.hashFactory);

		context.verifier = context.app.resolve(TransactionsRootVerifier);
	});

	it("should accept a block whose root hashes its transactions in order", async ({ hashFactory, verifier }) => {
		const sha256 = spy(hashFactory, "sha256");

		await verifier.execute(makeUnit(root, [hash1, hash2]));

		sha256.calledOnce();
		sha256.calledWith([Buffer.from(hash1, "hex"), Buffer.from(hash2, "hex")]);
	});

	it("should hash an empty list for a block without transactions", async ({ hashFactory, verifier }) => {
		const sha256 = spy(hashFactory, "sha256");

		await verifier.execute(makeUnit(root, []));

		sha256.calledWith([]);
	});

	it("should reject a block with another root", async ({ verifier }) => {
		await assert.rejects(
			() => verifier.execute(makeUnit("ee".repeat(32), [hash1, hash2])),
			InvalidTransactionsRoot,
			`Expected ${"ee".repeat(32)}, but got ${root}.`,
		);
	});
});
