import { describe, Sandbox } from "../../test-framework";
import {
	precommitData,
	precommitDataNoBlock,
	prevoteData,
	prevoteDataNoBlock,
	proposalData,
	proposalDataWithValidRound,
	serializedBlock,
	serializedPrecommit,
	serializedPrecommitForSignature,
	serializedPrecommitNoBlock,
	serializedPrevote,
	serializedPrevoteForSignature,
	serializedPrevoteNoBlock,
	serializedProposal,
	serializedProposalDataWithValidRound,
	serializedProposalDataWithValidRoundForSignature,
	serializedProposalForSignature,
} from "../test/fixtures/proposal";
import { prepareSandbox } from "../test/helpers/prepare-sandbox";
import { Serializer } from "./serializer";

describe<{
	sandbox: Sandbox;
	serializer: Serializer;
}>("Serializer", ({ it, assert, beforeEach }) => {
	beforeEach(async (context) => {
		await prepareSandbox(context);

		context.serializer = context.sandbox.app.resolve(Serializer);
	});

	it("#serializeProposal - should correctly serialize for signature", async ({ serializer }) => {
		const serialized = (
			await serializer.serializeProposal(
				{
					block: { serialized: serializedBlock },
					round: proposalData.round,
					validatorIndex: proposalData.validatorIndex,
				},
				{ includeSignature: false },
			)
		).toString("hex");

		assert.equal(serialized, serializedProposalForSignature);
	});

	it("#serializeProposal - should correctly serialize with signature", async ({ serializer }) => {
		const serialized = (
			await serializer.serializeProposal(
				{
					block: { serialized: serializedBlock },
					round: proposalData.round,
					signature: proposalData.signature,
					validatorIndex: proposalData.validatorIndex,
				},
				{ includeSignature: true },
			)
		).toString("hex");

		assert.equal(serialized, serializedProposal);
	});

	it("#serializeProposal - should correctly serialize for signature, with valid round", async ({ serializer }) => {
		const serialized = (
			await serializer.serializeProposal(
				{
					block: { serialized: serializedBlock },
					round: proposalDataWithValidRound.round,
					validRound: proposalDataWithValidRound.validRound,
					validatorIndex: proposalDataWithValidRound.validatorIndex,
				},
				{ includeSignature: false },
			)
		).toString("hex");

		assert.equal(serialized, serializedProposalDataWithValidRoundForSignature);
	});

	it("#serializeProposal - should correctly serialize with signature, with valid round", async ({ serializer }) => {
		const serialized = (
			await serializer.serializeProposal(
				{
					block: { serialized: serializedBlock },
					round: proposalDataWithValidRound.round,
					signature: proposalDataWithValidRound.signature,
					validRound: proposalDataWithValidRound.validRound,
					validatorIndex: proposalDataWithValidRound.validatorIndex,
				},
				{ includeSignature: true },
			)
		).toString("hex");

		assert.equal(serialized, serializedProposalDataWithValidRound);
	});
	it("#serializePrecommit - should correctly serialize for signature", async ({ serializer }) => {
		const serialized = (await serializer.serializePrecommitForSignature(precommitData)).toString("hex");
		assert.equal(serialized, serializedPrecommitForSignature);
	});

	it("#serializePrecommit - should correctly serialize with signature", async ({ serializer }) => {
		const serialized = (await serializer.serializePrecommit(precommitData)).toString("hex");
		assert.equal(serialized, serializedPrecommit);
	});

	it("#serializePrecommit - should correctly serialize without block", async ({ serializer }) => {
		const serialized = (await serializer.serializePrecommit(precommitDataNoBlock)).toString("hex");
		assert.equal(serialized, serializedPrecommitNoBlock);
	});

	it("#serializePrevote - should correctly serialize for signature", async ({ serializer }) => {
		const serialized = (await serializer.serializePrevoteForSignature(prevoteData)).toString("hex");
		assert.equal(serialized, serializedPrevoteForSignature);
	});

	it("#serializePrevote - should correctly serialize with signature", async ({ serializer }) => {
		const serialized = (await serializer.serializePrevote(prevoteData)).toString("hex");
		assert.equal(serialized, serializedPrevote);
	});

	it("#serializePrevote - should correctly serialize without block", async ({ serializer }) => {
		const serialized = (await serializer.serializePrevote(prevoteDataNoBlock)).toString("hex");
		assert.equal(serialized, serializedPrevoteNoBlock);
	});
});
