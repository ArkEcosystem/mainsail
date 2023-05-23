import { describe, Sandbox } from "../../test-framework";
import {
	precommitData,
	prevoteData,
	proposalData,
	serializedPrecommit,
	serializedPrevote,
	serializedProposal,
} from "../test/fixtures/proposal";
import { assertPrecommit, assertPrevote, assertProposal } from "../test/helpers/asserts";
import { prepareSandbox } from "../test/helpers/prepare-sandbox";
import { Deserializer } from "./deserializer";

describe<{
	sandbox: Sandbox;
	deserializer: Deserializer;
}>("Deserializer", ({ it, assert, beforeEach }) => {
	beforeEach(async (context) => {
		await prepareSandbox(context);

		context.deserializer = context.sandbox.app.resolve(Deserializer);
	});

	it("#deserializeProposal - should correctly deserialize", async ({ deserializer }) => {
		const deserialized = await deserializer.deserializeProposal(Buffer.from(serializedProposal, "hex"));
		assertProposal(assert, deserialized, proposalData);
	});

	it("#deserializePrecommit - should correctly deserialize", async ({ deserializer }) => {
		const deserialized = await deserializer.deserializePrecommit(Buffer.from(serializedPrecommit, "hex"));
		assertPrecommit(assert, deserialized, precommitData);
	});

	it("#deserializePrevote - should correctly deserialize", async ({ deserializer }) => {
		const deserialized = await deserializer.deserializePrevote(Buffer.from(serializedPrevote, "hex"));
		assertPrevote(assert, deserialized, prevoteData);
	});
});
