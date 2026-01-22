import { describe, Sandbox } from "@mainsail/test-framework";
import {
	proposalData,
	proposalDataWithValidRound,
	serializedProposal,
	serializedProposalDataWithValidRound,
} from "../test/fixtures/index.js";
import { assertProposal } from "../test/helpers/asserts";
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

	it("#deserializeProposal - should correctly deserialize, with validRound", async ({ deserializer }) => {
		const deserialized = await deserializer.deserializeProposal(
			Buffer.from(serializedProposalDataWithValidRound, "hex"),
		);
		assertProposal(assert, deserialized, proposalDataWithValidRound);
	});
});
