import { Contracts } from "@mainsail/contracts";
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
import { Deserializer } from "./deserializer";

describe<{
	sandbox: Sandbox;
	serializer: Serializer;
	deserializer: Deserializer;
}>("Serializer", ({ it, assert, beforeEach }) => {
	beforeEach(async (context) => {
		await prepareSandbox(context);

		context.serializer = context.sandbox.app.resolve(Serializer);
		context.deserializer = context.sandbox.app.resolve(Deserializer);
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

	it("#serialize - should serialize and deserialize lock proof", async ({ deserializer, serializer }) => {
		const proposalLockProof: Contracts.Crypto.AggregatedSignature = {
			signature:
				"927628d67c385fe216aa800def9cce0c09f5f9fbf836583d7c07ab6a98e1b5681802c92f81ad54984236a07fa389dbab1519f3c91ad39a505a61c3624a88c65da71fe721d7af0ed452516771b94d027be713dba68e14fa2c9680e35b63f0e038",
			validators: [true, true, true, false, false, true, true, true, true, false],
		};

		const serializedProposalLockProof =
			"927628d67c385fe216aa800def9cce0c09f5f9fbf836583d7c07ab6a98e1b5681802c92f81ad54984236a07fa389dbab1519f3c91ad39a505a61c3624a88c65da71fe721d7af0ed452516771b94d027be713dba68e14fa2c9680e35b63f0e0380ae701000000000000";

		const serialized = (await serializer.serializeLockProof(proposalLockProof)).toString("hex");
		assert.equal(serialized, serializedProposalLockProof);

		const deserialized = await deserializer.deserializeLockProof(Buffer.from(serialized, "hex"));
		assert.equal(proposalLockProof.signature, deserialized.signature);
		assert.equal(proposalLockProof.validators, deserialized.validators);
	});
});
