import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";
import {
	Proposal,
	lockProof,
	serializedLockProof
} from "../test/fixtures/index.js";
import { assertProposal } from "../test/helpers/asserts";
import { prepareSandbox } from "../test/helpers/prepare-sandbox";
import { Deserializer } from "./deserializer";

describe<{
	app: Application;
	deserializer: Deserializer;
}>("Deserializer", ({ it, assert, beforeEach }) => {
	beforeEach(async (context) => {
		await prepareSandbox(context);

		context.deserializer = context.app.resolve(Deserializer);
	});

	it("#deserializeProposal - should correctly deserialize", async ({ deserializer }) => {
		const deserialized = await deserializer.deserializeProposal(Buffer.from(Proposal.proposalSerialized, "hex"));
		assertProposal(assert, deserialized, Proposal.proposalData);
	});

	it("#deserializeLockProof - should correctly deserialize", async ({ deserializer }) => {
		const deserialized = await deserializer.deserializeLockProof(Buffer.from(serializedLockProof, "hex"));
		assert.equal(deserialized, lockProof);
	});
});
