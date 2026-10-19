import type { Contracts } from "@mainsail/contracts";

import { Identifiers } from "@mainsail/constants";
import { InvalidLegacySecondSignatureError, UnexpectedLegacySecondSignatureError } from "@mainsail/exceptions";
import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";

import { LegacyAttributeVerifier } from "./legacy-attribute-verifier.js";

const makeTransaction = (from: string, overrides: Record<string, unknown> = {}) => ({
	from,
	hash: `hash-${from}`,
	senderLegacyAddress: `legacy-${from}`,
	...overrides,
});

describe<{
	app: Application;
	evm: any;
	transactionVerifier: any;
	verifier: LegacyAttributeVerifier;
}>("LegacyAttributeVerifier", ({ it, beforeEach, assert, spy, stub }) => {
	const makeUnit = (transactions: unknown[]) =>
		({ getBlock: () => ({ transactions }) }) as Contracts.Processor.ProcessableUnit;

	beforeEach((context) => {
		context.evm = { getLegacyAttributes: async () => undefined };
		context.transactionVerifier = { verifyLegacySecondSignature: async () => true };

		context.app = new Application();
		context.app.bind(Identifiers.Evm.Instance).toConstantValue(context.evm).whenTagged("instance", "evm");
		context.app.bind(Identifiers.Cryptography.Transaction.Verifier).toConstantValue(context.transactionVerifier);

		context.verifier = context.app.resolve(LegacyAttributeVerifier);
	});

	it("should accept a block without transactions", async ({ evm, verifier }) => {
		const getLegacyAttributes = spy(evm, "getLegacyAttributes");

		await verifier.execute(makeUnit([]));

		getLegacyAttributes.neverCalled();
	});

	it("should accept a transaction from a sender without legacy attributes", async ({
		evm,
		transactionVerifier,
		verifier,
	}) => {
		const getLegacyAttributes = spy(evm, "getLegacyAttributes");
		const verifyLegacySecondSignature = spy(transactionVerifier, "verifyLegacySecondSignature");

		await verifier.execute(makeUnit([makeTransaction("alice")]));

		getLegacyAttributes.calledWith("alice", "legacy-alice");
		verifyLegacySecondSignature.neverCalled();
	});

	it("should accept a transaction from a sender whose legacy attributes carry no second public key", async ({
		evm,
		transactionVerifier,
		verifier,
	}) => {
		stub(evm, "getLegacyAttributes").resolvedValue({ legacyNonce: 1n });
		const verifyLegacySecondSignature = spy(transactionVerifier, "verifyLegacySecondSignature");

		await verifier.execute(makeUnit([makeTransaction("alice")]));

		verifyLegacySecondSignature.neverCalled();
	});

	it("should reject a legacy second signature from a sender without a second public key", async ({ verifier }) => {
		await assert.rejects(
			() => verifier.execute(makeUnit([makeTransaction("alice", { legacySecondSignature: "aa".repeat(65) })])),
			UnexpectedLegacySecondSignatureError,
		);
	});

	it("should verify the legacy second signature of a sender with a second public key", async ({
		evm,
		transactionVerifier,
		verifier,
	}) => {
		stub(evm, "getLegacyAttributes").resolvedValue({ secondPublicKey: "second-key" });
		const verifyLegacySecondSignature = spy(transactionVerifier, "verifyLegacySecondSignature");
		const transaction = makeTransaction("alice", { legacySecondSignature: "aa".repeat(65) });

		await verifier.execute(makeUnit([transaction]));

		verifyLegacySecondSignature.calledOnce();
		verifyLegacySecondSignature.calledWith(transaction, "second-key");
	});

	it("should look the legacy attributes of a sender up once per block", async ({
		evm,
		transactionVerifier,
		verifier,
	}) => {
		evm.getLegacyAttributes = async (from: string) =>
			from === "alice" ? { secondPublicKey: "alice-key" } : undefined;
		const getLegacyAttributes = spy(evm, "getLegacyAttributes");
		const verifyLegacySecondSignature = spy(transactionVerifier, "verifyLegacySecondSignature");

		await verifier.execute(
			makeUnit([
				makeTransaction("alice"),
				makeTransaction("bob"),
				makeTransaction("alice", { hash: "hash-alice-2" }),
			]),
		);

		getLegacyAttributes.calledTimes(2);
		getLegacyAttributes.calledNthWith(0, "alice", "legacy-alice");
		getLegacyAttributes.calledNthWith(1, "bob", "legacy-bob");
		verifyLegacySecondSignature.calledTimes(2);
	});

	it("should propagate a failing legacy second signature verification", async ({
		evm,
		transactionVerifier,
		verifier,
	}) => {
		stub(evm, "getLegacyAttributes").resolvedValue({ secondPublicKey: "second-key" });
		stub(transactionVerifier, "verifyLegacySecondSignature").rejectedValue(new InvalidLegacySecondSignatureError());

		await assert.rejects(
			() => verifier.execute(makeUnit([makeTransaction("alice")])),
			InvalidLegacySecondSignatureError,
		);
	});
});
